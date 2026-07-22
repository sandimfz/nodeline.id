# nodeline.id API — Marketplace Reference

> Base URL: `http://localhost:3000/api/v1` (dev)  
> Semua endpoint marketplace di bawah path `/api/v1/...`.  
> Role admin = **`god`** (bukan `admin`). Endpoint admin di-guard `@Roles('god')`.

---

## Ringkas

| Method | Path | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/v1/products` | - | publik | Katalog produk aktif (tanpa login) |
| GET | `/api/v1/products/:id` | - | publik | Detail 1 produk aktif |
| POST | `/api/v1/products/admin` | access token | `god` | Buat produk |
| PATCH | `/api/v1/products/admin/:id` | access token | `god` | Update produk |
| DELETE | `/api/v1/products/admin/:id` | access token | `god` | Hapus produk |
| GET | `/api/v1/products/admin/:id/pending-orders` | access token | `god` | Lihat order pending per produk |
| POST | `/api/v1/products/admin/:id/restock` | access token | `god` | Restock dari `.txt` |
| POST | `/api/v1/products/admin/:id/restock/manual` | access token | `god` | 1 unit manual |
| POST | `/api/v1/stock/assign` | access token | `god` | Assign unit spesifik ke order item |
| POST | `/api/v1/orders/checkout` | access token | user | Checkout (buat order) |
| GET | `/api/v1/orders` | access token | user | Riwayat order sendiri |
| GET | `/api/v1/orders/:id` | access token | user | Detail order sendiri |
| GET | `/api/v1/orders/:id/items/:orderItemId/content` | access token | user | Konten terkirim (anti-IDOR) |
| PATCH | `/api/v1/orders/:id/payment-note` | access token | user | Set catatan pembayaran |
| POST | `/api/v1/storage/upload` | access token | user/god | **[REKOMENDASI]** Upload + kompresi server-side |
| POST | `/api/v1/storage/request-upload` | access token | user/god | [LEGACY] Minta pre-signed URL upload |
| POST | `/api/v1/storage/confirm-upload` | access token | user/god | [LEGACY] Konfirmasi upload selesai |
| POST | `/api/v1/payments/confirm` | access token | `god` | Konfirmasi pembayaran → auto-assign |

---

## Produk (publik)

### `GET /api/v1/products`

Katalog produk aktif. Tidak butuh auth.

**Response `200 OK`**
```json
[
  {
    "id": "c1...",
    "sellerId": "a1...",
    "name": "OpenAI API Key Pro",
    "description": "Stock key siap pakai",
    "priceCents": 50000,
    "keysPerUnit": 1,
    "isActive": true,
    "lowStockThreshold": 5,
    "imageUrl": null,
    "createdAt": "2026-07-20T...Z",
    "updatedAt": "2026-07-20T...Z",
    "stockStatus": "AVAILABLE"
  }
]
```
> `stockStatus` hanya `AVAILABLE` atau `OUT_OF_STOCK` — **tidak** expose jumlah pasti.

### `GET /api/v1/products/:id`

Detail produk aktif. `404` kalau tidak ada / non-aktif.

---

## Produk (admin — `@Roles('god')`)

### `POST /api/v1/products/admin`

**Request**
```json
{
  "name": "OpenAI API Key Pro",
  "description": "Stock key siap pakai",
  "priceCents": 50000,
  "keysPerUnit": 1,
  "isActive": true,
  "warrantyPeriodDays": 30,
  "maxWarrantyClaims": 2,
  "imageUrl": "https://.../img.png"
}
```
| Field | Tipe | Aturan |
|---|---|---|
| `name` | string | wajib, ≤200 |
| `description` | string | opsional |
| `priceCents` | int | wajib, ≥0 |
| `keysPerUnit` | int | wajib, ≥1 |
| `isActive` | bool | opsional, default `true` |
| `warrantyPeriodDays` | int | opsional, ≥0 — masa garansi (hari) |
| `maxWarrantyClaims` | int | opsional, ≥0 — maksimal klaim garansi |
| `imageUrl` | string | opsional, ≤500 |

**Response `201 Created`** — objek produk (tanpa konten).

### `PATCH /api/v1/products/admin/:id`
Field opsional sama seperti create di atas. `404` kalau tidak ada.

### `GET /api/v1/products/admin/:id/pending-orders`
Lihat daftar order pending per produk. Berguna untuk admin memantau order yang belum dikonfirmasi.

**Response `200 OK`**
```json
[
  {
    "orderId": "o1...",
    "buyerId": "u1...",
    "buyerName": "Alice",
    "buyerEmail": "alice@n.test",
    "status": "PENDING_PAYMENT_CONFIRMATION",
    "totalCents": 50000,
    "whatsappNumber": "628123456789",
    "paymentNote": "sudah transfer",
    "quantity": 1,
    "createdAt": "2026-07-20T...Z"
  }
]
```
> Status order yang ditampilkan: `PENDING_PAYMENT_CONFIRMATION` atau `PAID_PENDING_FULFILLMENT`.
> Setiap order muncul sekali dengan quantity terkumpul (aggregate).

### `DELETE /api/v1/products/admin/:id`
`200` `{ "message": "Produk dihapus" }`. Stok ikut terhapus (cascade).

### `POST /api/v1/products/admin/:id/restock`
Restock dari teks `.txt` (satu baris per key/link). Baris non-kosong **harus kelipatan** `keysPerUnit` produk.

```json
{ "content": "sk-abc123\nsk-def456\nsk-ghi789\nsk-jkl012" }
```
(untuk `keysPerUnit: 2` → 2 unit, masing-masing 2 baris terenkripsi).

**Response `201`** `{ "inserted": 2 }`. Kalau jumlah baris tidak kelipatan → `400`.

### `POST /api/v1/products/admin/:id/restock/manual`
Satu unit isi bebas.
```json
{ "content": "https://example.com/invite/xyz" }
```

---

## Stock (admin — `@Roles('god')`)

### `POST /api/v1/stock/assign`
Assign manual unit spesifik ke order item (override FIFO).
```json
{ "orderItemId": "oi...", "stockUnitId": "su..." }
```
`400` kalau unit bukan milik produk order item / sudah tidak `AVAILABLE`. `200` `{ "message": "Stock unit di-assign" }`.

---

## Orders (user — login)

### `POST /api/v1/orders/checkout`
**Rate limit:** 20/menit. Membuat order; **tidak** mengambil stok (stok baru di-assign saat payment dikonfirmasi).

```json
{
  "whatsappNumber": "628123456789",
  "paymentNote": "sudah transfer via BCA",
  "items": [
    { "productId": "p1...", "quantity": 2 }
  ]
}
```
| Field | Tipe | Aturan |
|---|---|---|
| `whatsappNumber` | string | `IsPhoneNumber('ID')` |
| `paymentNote` | string | opsional, ≤2000 |
| `items` | array | ≥1, tiap `{ productId: uuid, quantity: int≥1 }` |

**Response `201 Created`**
```json
{
  "id": "o1...",
  "buyerId": "u1...",
  "whatsappNumber": "628123456789",
  "status": "PENDING_PAYMENT_CONFIRMATION",
  "totalCents": 100000,
  "paymentNote": "sudah transfer via BCA",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### `GET /api/v1/orders`
Riwayat order milik sendiri (terbaru duluan).

### `GET /api/v1/orders/:id`
Detail + items. Tiap item ada flag `hasContent` (sudah dapat konten atau belum).
```json
{
  "id": "o1...",
  "status": "FULFILLED",
  "items": [
    { "id":"oi...", "productId":"p1...", "productName":"...", "quantity":2, "priceCents":50000, "hasContent": true }
  ]
}
```

### `GET /api/v1/orders/:id/items/:orderItemId/content`
**Anti-IDOR:** order harus milik user YANG LOGIN DAN item harus milik order itu. Kalau order orang lain → `403`. Kalau item bukan milik order → `404`. Kalau belum ada fulfillment aktif → `404` (\"Konten belum tersedia\").

**Response `200`**
```json
{ "content": "sk-abc123\nsk-def456" }
```
> Konten didekripsi dari `stock_units.encrypted_content` (AES-256-GCM).

### `PATCH /api/v1/orders/:id/payment-note`
Body `{ "paymentNote": "..." }`. Hanya bisa sebelum dikonfirmasi (`PENDING_PAYMENT_CONFIRMATION`).

---

## Payments (admin — `@Roles('god')`)

### `POST /api/v1/payments/confirm`
Konfirmasi pembayaran manual → trigger auto-assign (FIFO).

```json
{ "orderId": "o1..." }
```
**Logic:**
1. Order harus status `PENDING_PAYMENT_CONFIRMATION` (lain → `400`).
2. Set `PAID_PENDING_FULFILLMENT`.
3. Assign 1 unit AVAILABLE per item (`FOR UPDATE SKIP LOCKED`).
4. Kalau **semua** item dapat unit → `FULFILLED`. Kalau ada yang kosong → tetap `PAID_PENDING_FULFILLMENT` (antri, otomatis terisi saat admin restock).
5. Catat ke `audit_logs` + `notify` stub.

**Response `200`** `{ "status": "FULFILLED" }` atau `{ "status": "PAID_PENDING_FULFILLMENT" }`.

---

## Alur Lengkap (happy path)

```
1. god:  POST /products/admin            → 201 produk P (keysPerUnit=1)
2. god:  POST /products/admin/P/restock  → { inserted: 3 }  (3 unit AVAILABLE)
3. user:  POST /orders/checkout         → 201 order O (status PENDING_PAYMENT_CONFIRMATION)
4. god:  POST /payments/confirm {O}      → { status: FULFILLED }
5. user:  GET  /orders/O/items/I/content → 200 { content: "sk-..." }
```

## Alur empty-pool → restock → auto-fill

```
1. god:  POST /products/admin            → produk P
2. user:  POST /orders/checkout         → order O (PENDING_PAYMENT_CONFIRMATION)
3. god:  POST /payments/confirm {O}     → { status: PAID_PENDING_FULFILLMENT }  (stok kosong)
4. god:  POST /products/admin/P/restock → { inserted: 2 }
   ↳ tryAutoFulfillPendingOrders jalan → order O jadi FULFILLED otomatis
5. user:  GET /orders/O/items/I/content → 200 { content: "..." }
```

## Error format
Sama dengan Auth: `{ "statusCode": 403, "message": "...", "error": "Forbidden" }`.

## Belum diimplementasi (ditunda)
- Warranty (klaim garansi)
- Refund
- Review

---

## Storage (user login)

Upload gambar produk dan bukti bayar ke Cloudflare R2. Semua endpoint di-guard `JwtAuthGuard` — **hanya user login yang bisa upload**.

Dua metode upload tersedia:

### Metode 1 (REKOMENDASI): Upload via Server — Kompresi Otomatis

`POST /api/v1/storage/upload`

**Alur:**
1. Client upload file langsung ke server via `multipart/form-data`.
2. Server validasi file, lalu kompres dengan **sharp**:
   - Resize: maksimal **1200px** (pertahankan aspek ratio)
   - Format: **WebP** (kualitas **80%**)
3. File terkompresi (biasanya ~100-200 KB) diupload ke Cloudflare R2.
4. Server return public URL + info ukuran.

**Request** (`multipart/form-data`)

| Field | Tipe | Aturan |
|---|---|---|
| `file` | file | wajib — JPEG, PNG, WebP, atau HEIC, max 10 MB |
| `purpose` | string | wajib: `product-image` atau `payment-proof` |
| `productId` | uuid | opsional — attach ke produk (untuk product-image) |
| `orderId` | uuid | opsional — attach ke order (untuk payment-proof) |

Contoh dengan curl:
```bash
curl -X POST http://localhost:3000/api/v1/storage/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@foto.jpg" \
  -F "purpose=product-image" \
  -F "productId=uuid-produk"
```

**Response `200 OK`**
```json
{
  "url": "https://r2.nodeline.id/product-image/user-uuid/uuid.webp",
  "originalSize": 5242880,
  "compressedSize": 152340
}
```
> File otomatis dikonversi ke `.webp` — tidak perlu khawatir ekstensi asli.

**Keuntungan metode ini:**
-  File langsung dioptimasi — ukuran turun drastis (5 MB → ~150 KB)
-  Server validasi gambar dengan **sharp** (bukan magic bytes manual)
-  Output selalu WebP — format paling efisien untuk web
-  Client cukup 1 request, tidak perlu 3 langkah
-  Tidak perlu setup CORS / pre-signed URL di client

---

### Metode 2 (LEGACY): Pre-signed URL — Upload Langsung ke R2

Gunakan metode ini jika ingin upload langsung dari client ke R2 (melewati server). Dua endpoint:

#### `POST /api/v1/storage/request-upload`
Minta pre-signed URL untuk upload langsung ke Cloudflare R2.

**Request**
```json
{
  "purpose": "product-image",
  "fileName": "produk-1.jpg",
  "contentType": "image/jpeg"
}
```
| Field | Tipe | Aturan |
|---|---|---|
| `purpose` | string | wajib: `product-image` atau `payment-proof` |
| `fileName` | string | wajib, max 255 char |
| `contentType` | string | wajib: `image/jpeg`, `image/png`, atau `image/webp` |

**Response `200 OK`**
```json
{
  "uploadUrl": "https://...r2.cloudflarestorage.com/...?X-Amz-Signature=...",
  "fileKey": "product-image/user-abc/xxx-file.jpg",
  "publicUrl": "https://r2.nodeline.id/product-image/user-abc/xxx-file.jpg"
}
```
> Pre-signed URL expired dalam 10 menit.

#### `POST /api/v1/storage/confirm-upload`
Konfirmasi upload selesai, dapatkan public URL final.

**Request**
```json
{
  "fileKey": "product-image/user-abc/xxx-file.jpg",
  "productId": "uuid-opsional",
  "orderId": "uuid-opsional"
}
```

**Response `200 OK`**
```json
{ "url": "https://r2.nodeline.id/product-image/user-abc/xxx-file.jpg" }
```
> Server akan verifikasi file benar-benar sudah ada di R2 sebelum mengembalikan URL.

---

### Keamanan Upload
-  Hanya **user login** yang bisa upload (`@UseGuards(JwtAuthGuard)`)
-  File type dibatasi: hanya `jpeg`, `png`, `webp`, `heic`, `heif`
-  File key unik (UUID) + prefix user — cegah overwrite/enumeration
-  **Metode 1**: kompresi server-side dengan sharp + validasi gambar real
-  **Metode 1**: output WebP — format modern, ukuran kecil, kualitas tinggi
-  Ownership check saat attach ke product/order
-  Cleanup otomatis jika attach gagal (file dihapus dari R2)
