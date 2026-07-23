# Products API

**Prefix:** `/api/v1/products`

---

## Public Endpoints

### GET /products

Mendapatkan katalog produk (hanya produk aktif).

**Auth:** None (public)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "sellerId": "uuid",
    "name": "Nama Produk",
    "description": "Deskripsi produk",
    "priceCents": 50000,
    "keysPerUnit": 1,
    "isActive": true,
    "lowStockThreshold": 5,
    "warrantyPeriodDays": null,
    "maxWarrantyClaims": null,
    "imageUrl": "https://r2.dev/...",
    "categoryId": "uuid",
    "stockStatus": "AVAILABLE",
    "categoryName": "Template",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Fields:**
- `stockStatus`: `"AVAILABLE"` | `"OUT_OF_STOCK"` — coarse status, bukan exact count
- `priceCents`: Harga dalam sen (Rp 50.000 = 50000)

---

### GET /products/:id

Mendapatkan detail produk.

**Auth:** None (public)

**Response (200):** Sama seperti di atas, single object.

**Error (404):** `"Produk tidak ditemukan"`

---

## Admin Endpoints (God Only)

**Prefix:** `/api/v1/products/admin`

**Auth:** JWT + Role `god`

### POST /products/admin

Membuat produk baru.

**Request:**
```json
{
  "name": "Nama Produk",
  "description": "Deskripsi (opsional)",
  "priceCents": 50000,
  "keysPerUnit": 1,
  "isActive": true,
  "warrantyPeriodDays": null,
  "maxWarrantyClaims": null,
  "imageUrl": "https://...",
  "categoryId": "uuid"
}
```

**Response (201):** Product object

---

### PATCH /products/admin/:id

Update produk.

**Request:** Partial dari create product fields.

**Response (200):** Product object yang sudah diupdate

---

### DELETE /products/admin/:id

Hapus produk (beserta stoknya).

**Response (200):** `{ "message": "Produk dihapus" }`

---

### GET /products/admin/:id/pending-orders

Mendapatkan daftar order pending yang mengandung produk ini.

**Response (200):**
```json
[
  {
    "orderId": "uuid",
    "buyerId": "uuid",
    "buyerName": "John Doe",
    "buyerEmail": "john@example.com",
    "status": "PAID_PENDING_FULFILLMENT",
    "totalCents": 50000,
    "whatsappNumber": "628123456789",
    "paymentNote": null,
    "quantity": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### POST /products/admin/:id/restock

Restock produk dari text body (di-paste dari file .txt).

**Request:**
```json
{
  "content": "key1\nkey2\nkey3\nkey4"
}
```

Content akan di-chunk per `keysPerUnit` produk. Setiap chunk dienkripsi AES-256-GCM.

**Response (201):**
```json
{
  "inserted": 4
}
```

Setelah restock, sistem akan auto-fulfill order PAID_PENDING_FULFILLMENT yang menunggu stok produk ini.

---

### GET /products/admin/:id/stock-units

Mendapatkan daftar stock units (dengan konten terdekripsi).

**Response (200):**
```json
[
  {
    "id": "uuid",
    "content": "key1\nkey2",
    "status": "AVAILABLE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "soldAt": null
  }
]
```

---

### POST /products/admin/:id/restock/manual

Menambahkan satu unit secara manual.

**Request:**
```json
{
  "content": "custom-link-or-key"
}
```

**Response (201):** `{ "id": "uuid" }`
