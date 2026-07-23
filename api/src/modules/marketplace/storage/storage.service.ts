import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { products, orders, users } from '../../../database/drizzle/schema/index.js';

export type UploadPurpose = 'product-image' | 'payment-proof' | 'avatar';

const ALLOWED_PURPOSES: UploadPurpose[] = ['product-image', 'payment-proof', 'avatar'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10 MB — batas upload mentah dari client

// Konstanta kompresi gambar (payment-proof)
const MAX_IMAGE_DIMENSION = 1200; // px — maksimal lebar/tinggi setelah resize
const WEBP_QUALITY = 80; // 0-100 — kualitas kompresi WebP

// Konstanta validasi gambar produk
const PRODUCT_IMAGE_MIN_DIMENSION = 800; // px — minimal lebar/tinggi
const PRODUCT_IMAGE_MAX_DIMENSION = 1080; // px — maksimal lebar/tinggi
const PRODUCT_IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const PRODUCT_IMAGE_MIN_RATIO = 0.75; // 3:4
const PRODUCT_IMAGE_MAX_RATIO = 1.0; // 1:1

/**
 * Magic bytes signature untuk validasi file benar-benar gambar.
 * Dipakai di legacy flow (confirmUpload) untuk file yang diupload
 * langsung ke R2 via pre-signed URL.
 */
const IMAGE_SIGNATURES: { mime: string; bytes: number[]; offset: number }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header
  // HEIC/HEIF (ISOBMFF): "ftyp" at offset 4 + major brand "heic" or "heix" at offset 8
  {
    mime: 'image/heic',
    bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63],
    offset: 4,
  }, // "ftypheic"
  {
    mime: 'image/heic',
    bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x78],
    offset: 4,
  }, // "ftypheix"
  {
    mime: 'image/heif',
    bytes: [0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31],
    offset: 4,
  }, // "ftypmif1"
];

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

/**
 * Cloudflare R2 storage service.
 *
 * Upload flow (Opsi 1 — direkomendasikan):
 * 1. Authenticated user uploads file langsung ke server via POST /storage/upload.
 * 2. Server validates, compresses with sharp (max 1200px, WebP 80%), then
 *    uploads the optimized image to Cloudflare R2.
 * 3. Server returns the public URL (optionally attached to a product or order).
 *
 * Legacy flow (direct upload via pre-signed URL) still available via
 * request-upload + confirm-upload.
 */
@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly drizzle: DrizzleService,
  ) {
    const accountId = this.config.get<string>('r2.accountId')!;
    this.bucket = this.config.get<string>('r2.bucketName')!;
    this.publicUrl = this.config.get<string>('r2.publicUrl');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('r2.accessKeyId')!,
        secretAccessKey: this.config.get<string>('r2.secretAccessKey')!,
      },
    });
  }

  // ──────────────────────────────────────────────
  //  COMPRESSED UPLOAD (Opsi 1 — via server)
  // ──────────────────────────────────────────────

  /**
   * Upload gambar dengan kompresi server-side.
   *
   * 1. Validasi file (ukuran, format)
   * 2. Kompres dengan sharp (resize max 1200px, WebP quality 80%)
   * 3. Upload hasil kompresi ke Cloudflare R2
   * 4. Attach ke product/order jika diminta
   * 5. Kembalikan public URL
   */
  async uploadImage(
    userId: string,
    fileBuffer: Buffer,
    input: {
      purpose: UploadPurpose;
      productId?: string;
      orderId?: string;
    },
  ): Promise<{ url: string; originalSize: number; compressedSize: number }> {
    // ── Validasi ukuran input ──
    if (fileBuffer.length > MAX_INPUT_SIZE) {
      throw new BadRequestException(
        `File terlalu besar. Maksimal ${MAX_INPUT_SIZE / 1024 / 1024} MB`,
      );
    }
    if (fileBuffer.length === 0) {
      throw new BadRequestException('File kosong');
    }

    // ── Validasi purpose ──
    if (!ALLOWED_PURPOSES.includes(input.purpose)) {
      throw new BadRequestException(
        `Tujuan harus: ${ALLOWED_PURPOSES.join(', ')}`,
      );
    }

    // ── Validasi product/order mutual exclusive ──
    if (input.productId && input.orderId) {
      throw new BadRequestException(
        'Hanya bisa pilih salah satu: productId atau orderId, tidak keduanya',
      );
    }
    if (input.productId && input.purpose !== 'product-image') {
      throw new BadRequestException(
        'Untuk attach ke produk, purpose harus product-image',
      );
    }
    if (input.orderId && input.purpose !== 'payment-proof') {
      throw new BadRequestException(
        'Untuk attach ke order, purpose harus payment-proof',
      );
    }

    // ── Validasi & proses sesuai purpose ──
    let uploadBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    try {
      const metadata = await sharp(fileBuffer).metadata();

      if (input.purpose === 'product-image') {
        // ── Validasi ketat untuk gambar produk ──
        // Format: hanya JPEG, PNG, WebP
        if (
          !metadata.format ||
          !['jpeg', 'png', 'webp'].includes(metadata.format)
        ) {
          throw new BadRequestException(
            'Format gambar produk harus JPEG, PNG, atau WebP',
          );
        }

        const { width, height } = metadata;

        if (!width || !height) {
          throw new BadRequestException('Tidak dapat membaca dimensi gambar');
        }

        // Dimensi: 800×800 s/d 1080×1080
        if (
          width < PRODUCT_IMAGE_MIN_DIMENSION ||
          height < PRODUCT_IMAGE_MIN_DIMENSION ||
          width > PRODUCT_IMAGE_MAX_DIMENSION ||
          height > PRODUCT_IMAGE_MAX_DIMENSION
        ) {
          throw new BadRequestException(
            `Dimensi gambar harus antara ${PRODUCT_IMAGE_MIN_DIMENSION}×${PRODUCT_IMAGE_MIN_DIMENSION} hingga ${PRODUCT_IMAGE_MAX_DIMENSION}×${PRODUCT_IMAGE_MAX_DIMENSION} piksel`,
          );
        }

        // Rasio: 1:1 (persegi) hingga 3:4
        const ratio = width / height;
        if (
          ratio < PRODUCT_IMAGE_MIN_RATIO ||
          ratio > PRODUCT_IMAGE_MAX_RATIO
        ) {
          throw new BadRequestException(
            'Rasio gambar harus antara 1:1 (persegi) hingga 3:4',
          );
        }

        // Ukuran file: maks 2 MB
        if (fileBuffer.length > PRODUCT_IMAGE_MAX_SIZE) {
          throw new BadRequestException(
            'Ukuran file gambar produk maksimal 2 MB',
          );
        }

        // Upload file asli TANPA kompresi/resize (user wajib upload sesuai ukuran)
        uploadBuffer = fileBuffer;
        const mimeMap: Record<string, string> = {
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
        };
        contentType = mimeMap[metadata.format] ?? 'image/jpeg';
        fileExtension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
      } else if (input.purpose === 'avatar') {
        // ── Avatar: resize ke 400x400, WebP 80% ──
        if (
          !metadata.format ||
          !['jpeg', 'png', 'webp'].includes(metadata.format)
        ) {
          throw new BadRequestException(
            'Format avatar harus JPEG, PNG, atau WebP',
          );
        }

        // Ukuran file: maks 2 MB
        if (fileBuffer.length > 2 * 1024 * 1024) {
          throw new BadRequestException(
            'Ukuran file avatar maksimal 2 MB',
          );
        }

        uploadBuffer = await sharp(fileBuffer)
          .resize({
            width: 400,
            height: 400,
            fit: 'cover',
            position: 'centre',
          })
          .webp({ quality: 80 })
          .toBuffer();

        contentType = 'image/webp';
        fileExtension = 'webp';
      } else {
        // ── payment-proof: kompres dengan sharp (existing behavior) ──
        if (
          !metadata.format ||
          !['jpeg', 'png', 'webp', 'heif'].includes(metadata.format)
        ) {
          throw new BadRequestException(
            'File bukan gambar valid. Hanya JPEG, PNG, WebP, dan HEIC yang diizinkan.',
          );
        }

        uploadBuffer = await sharp(fileBuffer)
          .resize({
            width: MAX_IMAGE_DIMENSION,
            height: MAX_IMAGE_DIMENSION,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        contentType = 'image/webp';
        fileExtension = 'webp';
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('File tidak dapat diproses sebagai gambar');
    }

    // ── Generate file key ──
    const uuid = randomUUID();
    const fileKey = `${input.purpose}/${userId}/${uuid}.${fileExtension}`;

    // ── Upload file ke R2 ──
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileKey,
          Body: uploadBuffer,
          ContentType: contentType,
        }),
      );
    } catch {
      throw new UnprocessableEntityException(
        'Gagal mengupload file ke storage',
      );
    }

    // ── Build public URL ──
    const url = this.publicUrl
      ? `${this.publicUrl}/${fileKey}`
      : `https://${this.bucket}.r2.dev/${fileKey}`;

    // ── Auto-attach avatar ke user ──
    if (input.purpose === 'avatar') {
      await this.drizzle.db
        .update(users)
        .set({ avatarUrl: url, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    // ── Attach ke product/order ──
    if (input.productId) {
      const [product] = await this.drizzle.db
        .select({ sellerId: products.sellerId })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!product) {
        // Cleanup: hapus file dari R2 karena gagal attach
        await this.deleteFile(fileKey).catch(() => {});
        throw new NotFoundException('Produk tidak ditemukan');
      }
      if (product.sellerId !== userId) {
        await this.deleteFile(fileKey).catch(() => {});
        throw new ForbiddenException('Anda tidak memiliki akses ke produk ini');
      }

      await this.drizzle.db
        .update(products)
        .set({ imageUrl: url, updatedAt: new Date() })
        .where(eq(products.id, input.productId));
    }

    if (input.orderId) {
      const [order] = await this.drizzle.db
        .select({ buyerId: orders.buyerId, paymentNote: orders.paymentNote })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        await this.deleteFile(fileKey).catch(() => {});
        throw new NotFoundException('Order tidak ditemukan');
      }
      if (order.buyerId !== userId) {
        await this.deleteFile(fileKey).catch(() => {});
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      const existingNote = order.paymentNote ?? '';
      const noteMaxLength = 2000;
      const proofLine = `\n[BUKTI BAYAR] ${url}`;
      const newNote =
        (existingNote + proofLine).length > noteMaxLength
          ? existingNote.slice(0, noteMaxLength - proofLine.length) + proofLine
          : existingNote + proofLine;

      await this.drizzle.db
        .update(orders)
        .set({
          paymentNote: newNote,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId));
    }

    return {
      url,
      originalSize: fileBuffer.length,
      compressedSize: uploadBuffer.length,
    };
  }

  // ──────────────────────────────────────────────
  //  LEGACY: PRE-SIGNED URL FLOW
  // ──────────────────────────────────────────────

  /**
   * Generate a pre-signed upload URL so the client can upload directly to R2.
   * Only authenticated users can call this (guarded at controller level).
   */
  async getUploadUrl(
    userId: string,
    input: {
      purpose: UploadPurpose;
      fileName: string;
      contentType: string;
    },
  ): Promise<UploadUrlResult> {
    // Validate purpose
    if (!ALLOWED_PURPOSES.includes(input.purpose)) {
      throw new BadRequestException(
        `Tujuan harus: ${ALLOWED_PURPOSES.join(', ')}`,
      );
    }

    // Validate content type
    if (!ALLOWED_MIME_TYPES.includes(input.contentType)) {
      throw new BadRequestException(
        `Tipe file tidak diizinkan. Hanya: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file extension
    const ext = '.' + input.fileName.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Ekstensi file tidak diizinkan. Hanya: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Sanitize filename: only keep safe characters
    const safeName = input.fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);

    // Unique key with user prefix to prevent enumeration / overwrite
    const uuid = randomUUID();
    const fileKey = `${input.purpose}/${userId}/${uuid}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: input.contentType,
      // Note: ContentLength sengaja tidak disertakan karena akan membuat
      // pre-signed URL hanya menerima file dengan ukuran EXACTLY segitu.
      // Untuk batas ukuran, server-side validation via sharp lebih baik.
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 600, // 10 menit
    });

    const publicUrl = this.publicUrl
      ? `${this.publicUrl}/${fileKey}`
      : `https://${this.bucket}.r2.dev/${fileKey}`;

    return { uploadUrl, fileKey, publicUrl };
  }

  /**
   * Confirm that an upload exists in R2 and return its public URL.
   * Optionally attach the image to a product or order.
   *
   * Security:
   * - Verifies the authenticated user owns the product/order
   * - Validates magic bytes: file benar-benar gambar, bukan rename ekstensi
   * - Verifikasi Content-Type di R2 match dengan yang dijanjikan
   * - Cegah User A overwrite gambar User B
   */
  async confirmUpload(
    userId: string,
    fileKey: string,
    options?: { productId?: string; orderId?: string },
  ): Promise<{ url: string }> {
    // Fetch object metadata + first bytes from R2 for validation
    let storedContentType: string | undefined;
    let magicBuffer: Buffer;

    try {
      const getCmd = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Range: 'bytes=0-63', // we only need first 64 bytes for magic check
      });
      const response = await this.s3.send(getCmd);
      storedContentType = response.ContentType;

      // Read first chunk from Node.js Readable stream
      const body = response.Body as NodeJS.ReadableStream | undefined;
      if (body) {
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(Buffer.from(chunk as Buffer));
          break; // only need the first chunk
        }
        magicBuffer =
          chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0);
      } else {
        magicBuffer = Buffer.alloc(0);
      }
    } catch {
      throw new NotFoundException('File belum terupload ke storage');
    }

    // === VALIDATION 1: Content-Type match ===
    const storedType = (storedContentType ?? '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(storedType)) {
      await this.deleteFile(fileKey).catch(() => {});
      throw new UnprocessableEntityException(
        'Tipe file tidak sesuai dengan yang diizinkan',
      );
    }

    // === VALIDATION 2: Magic bytes check ===
    // Catatan: untuk flow baru via uploadImage(), validasi sudah dilakukan
    // oleh sharp sehingga magic bytes check ini hanya untuk legacy flow.
    if (magicBuffer.length > 0) {
      const isValidImage = IMAGE_SIGNATURES.some((sig) =>
        sig.bytes.every((byte, i) => {
          const idx = sig.offset + i;
          return idx < magicBuffer.length && magicBuffer[idx] === byte;
        }),
      );

      if (!isValidImage) {
        await this.deleteFile(fileKey).catch(() => {});
        throw new UnprocessableEntityException(
          'File bukan gambar valid. Hanya JPEG, PNG, WebP, dan HEIC yang diizinkan.',
        );
      }
    }

    const url = this.publicUrl
      ? `${this.publicUrl}/${fileKey}`
      : `https://${this.bucket}.r2.dev/${fileKey}`;

    // === VALIDATION 3: Purpose matches attachment type ===
    const actualPurpose = fileKey.split('/')[0] as UploadPurpose;
    if (options?.productId && actualPurpose !== 'product-image') {
      throw new BadRequestException(
        'File ini bukan untuk product image, tidak bisa di-attach ke produk',
      );
    }
    if (options?.orderId && actualPurpose !== 'payment-proof') {
      throw new BadRequestException(
        'File ini bukan untuk bukti bayar, tidak bisa di-attach ke order',
      );
    }
    if (options?.productId && options?.orderId) {
      throw new BadRequestException(
        'Hanya bisa pilih salah satu: productId atau orderId, tidak keduanya',
      );
    }

    // Attach to product if productId provided — ownership check
    if (options?.productId) {
      const [product] = await this.drizzle.db
        .select({ sellerId: products.sellerId })
        .from(products)
        .where(eq(products.id, options.productId))
        .limit(1);

      if (!product) {
        throw new NotFoundException('Produk tidak ditemukan');
      }
      if (product.sellerId !== userId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke produk ini');
      }

      await this.drizzle.db
        .update(products)
        .set({ imageUrl: url, updatedAt: new Date() })
        .where(eq(products.id, options.productId));
    }

    // Attach to order if orderId provided — ownership check
    if (options?.orderId) {
      const [order] = await this.drizzle.db
        .select({ buyerId: orders.buyerId, paymentNote: orders.paymentNote })
        .from(orders)
        .where(eq(orders.id, options.orderId))
        .limit(1);

      if (!order) {
        throw new NotFoundException('Order tidak ditemukan');
      }
      if (order.buyerId !== userId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      const existingNote = order.paymentNote ?? '';
      const noteMaxLength = 2000;
      const proofLine = `\n[BUKTI BAYAR] ${url}`;
      const newNote =
        (existingNote + proofLine).length > noteMaxLength
          ? existingNote.slice(0, noteMaxLength - proofLine.length) + proofLine
          : existingNote + proofLine;

      await this.drizzle.db
        .update(orders)
        .set({
          paymentNote: newNote,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, options.orderId));
    }

    return { url };
  }

  // ──────────────────────────────────────────────
  //  FILE MANAGEMENT
  // ──────────────────────────────────────────────

  /**
   * Delete a file from R2.
   */
  async deleteFile(fileKey: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      }),
    );
  }
}
