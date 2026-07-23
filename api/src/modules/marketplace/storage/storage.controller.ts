import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { StorageService } from './storage.service.js';
import { RequestUploadDto } from './dto/request-upload.dto.js';
import { ConfirmUploadDto } from './dto/confirm-upload.dto.js';

interface AuthedUser {
  id: string;
  role: string;
}

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /**
   * [REKOMENDASI] Upload gambar langsung ke server.
   *
   * Alur:
   * 1. Client upload file (multipart/form-data) ke endpoint ini
   * 2. Server validasi & kompres dengan sharp (max 1200px → WebP 80%)
   * 3. Server upload hasil kompresi ke Cloudflare R2
   * 4. Server return public URL
   *
   * Fields:
   * - file: image file (jpeg/png/webp, max 10 MB)
   * - purpose: "product-image" | "payment-proof"
   * - productId: (opsional) UUID produk untuk attach
   * - orderId: (opsional) UUID order untuk attach (payment-proof)
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB (validasi lebih ketat di service)
    }),
  )
  async upload(
    @CurrentUser() user: AuthedUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp|heic|heif)$/i,
          errorMessage:
            'Tipe file tidak valid. Hanya JPG, PNG, WebP, dan HEIC yang diizinkan.',
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10 MB — validasi lebih ketat di service per-purpose
          errorMessage: 'File terlalu besar. Maksimal 10 MB.',
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
    @Body('purpose') purpose: string,
    @Body('productId') productId?: string,
    @Body('orderId') orderId?: string,
  ) {
    if (!purpose) {
      throw new BadRequestException('Purpose wajib diisi');
    }

    if (!['product-image', 'payment-proof', 'avatar'].includes(purpose)) {
      throw new BadRequestException(
        'Purpose harus product-image, payment-proof, atau avatar',
      );
    }

    return this.storage.uploadImage(user.id, file.buffer, {
      purpose: purpose as 'product-image' | 'payment-proof' | 'avatar',
      productId,
      orderId,
    });
  }

  /**
   * [LEGACY] Request a pre-signed upload URL.
   * Client uploads directly to R2 using the returned URL.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('request-upload')
  @HttpCode(HttpStatus.OK)
  async requestUpload(
    @CurrentUser() user: AuthedUser,
    @Body() dto: RequestUploadDto,
  ) {
    return this.storage.getUploadUrl(user.id, {
      purpose: dto.purpose,
      fileName: dto.fileName,
      contentType: dto.contentType,
    });
  }

  /**
   * [LEGACY] Confirm that an upload completed and get the public URL.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('confirm-upload')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @CurrentUser() user: AuthedUser,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.storage.confirmUpload(user.id, dto.fileKey, {
      productId: dto.productId,
      orderId: dto.orderId,
    });
  }
}
