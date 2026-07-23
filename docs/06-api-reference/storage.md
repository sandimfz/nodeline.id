# Storage API

**Prefix:** `/api/v1/storage`

**Auth:** JWT Access Token

---

## POST /storage/upload (Rekomendasi)

Upload gambar langsung ke server. Server akan validasi, kompres (jika perlu), dan upload ke Cloudflare R2.

**Rate Limit:** 10 requests / 60 detik

**Request:** `multipart/form-data`

| Field | Type | Required | Deskripsi |
|-------|------|----------|-----------|
| `file` | File | Yes | Image file (JPEG/PNG/WebP/HEIC) |
| `purpose` | String | Yes | `product-image`, `payment-proof`, atau `avatar` |
| `productId` | String | No | UUID produk (untuk `product-image`) |
| `orderId` | String | No | UUID order (untuk `payment-proof`) |

**Validasi per Purpose:**

| Purpose | Max Size | Format | Dimensi | Proses |
|---------|----------|--------|---------|--------|
| `product-image` | 2 MB | JPEG, PNG, WebP | 800-1080px, rasio 1:1 s/d 3:4 | Upload original (tanpa resize) |
| `payment-proof` | 10 MB | JPEG, PNG, WebP, HEIC | Max 1200px | Resize + WebP 80% |
| `avatar` | 2 MB | JPEG, PNG, WebP | Resize ke 400x400 cover | Resize + WebP 80% |

**Response (200):**
```json
{
  "url": "https://r2.dev/...",
  "originalSize": 1024000,
  "compressedSize": 512000
}
```

**Auto-attach:**
- `avatar`: URL langsung di-set ke user yang upload
- `product-image`: URL di-set ke field `imageUrl` produk
- `payment-proof`: URL ditambahkan ke `paymentNote` order dengan format `[BUKTI BAYAR] {url}`

---

## POST /storage/request-upload (Legacy)

Mendapatkan pre-signed URL untuk upload langsung ke R2.

**Rate Limit:** 10 requests / 60 detik

**Request:**
```json
{
  "purpose": "product-image",
  "fileName": "photo.jpg",
  "contentType": "image/jpeg"
}
```

**Response (200):**
```json
{
  "uploadUrl": "https://r2.cloudflarestorage.com/...",
  "fileKey": "product-image/user-uuid/file.jpg",
  "publicUrl": "https://r2.dev/product-image/user-uuid/file.jpg"
}
```

---

## POST /storage/confirm-upload (Legacy)

Konfirmasi upload dan dapatkan public URL. Validasi magic bytes untuk memastikan file benar-benar gambar.

**Rate Limit:** 30 requests / 60 detik

**Request:**
```json
{
  "fileKey": "product-image/user-uuid/file.jpg",
  "productId": "uuid",
  "orderId": "uuid"
}
```

**Response (200):**
```json
{
  "url": "https://r2.dev/product-image/user-uuid/file.jpg"
}
```
