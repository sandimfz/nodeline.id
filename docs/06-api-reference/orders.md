# Orders API

**Prefix:** `/api/v1/orders`

**Auth:** Semua endpoint membutuhkan JWT Access Token.

---

## POST /orders/checkout

Membuat pesanan baru.

**Rate Limit:** 20 requests / 60 detik

**Request:**
```json
{
  "whatsappNumber": "628123456789",
  "items": [
    { "productId": "uuid", "quantity": 1 }
  ],
  "paymentNote": "Transfer BCA a.n John Doe"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "buyerId": "uuid",
  "whatsappNumber": "628123456789",
  "status": "PENDING_PAYMENT_CONFIRMATION",
  "totalCents": 50000,
  "paymentNote": "Transfer BCA a.n John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error (400):** Stok tidak mencukupi, produk tidak aktif, atau item kosong

---

## GET /orders

Mendapatkan daftar pesanan milik user yang sedang login.

**Response (200):** Array of Order objects

---

## GET /orders/:id

Mendapatkan detail pesanan milik user yang sedang login.

**Response (200):**
```json
{
  "id": "uuid",
  "buyerId": "uuid",
  "whatsappNumber": "628123456789",
  "status": "FULFILLED",
  "totalCents": 50000,
  "paymentNote": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Nama Produk",
      "quantity": 1,
      "priceCents": 50000,
      "hasContent": true
    }
  ]
}
```

**Anti-IDOR:** Hanya pemilik order yang bisa mengakses.

---

## PATCH /orders/:id/payment-note

Update catatan pembayaran.

**Request:**
```json
{
  "paymentNote": "Catatan baru"
}
```

**Response (200):** Order object

**Error (400):** Order sudah tidak dalam status PENDING_PAYMENT_CONFIRMATION

---

## GET /orders/:id/items/:orderItemId/content

Mendapatkan konten terdekripsi untuk item yang sudah terfulfill.

**Response (200):**
```json
{
  "content": "decrypted-key-or-link"
}
```

**Anti-IDOR:** Tiga lapis validasi — order ownership + item belongs to order + item has active fulfillment.

**Error (404):** Item belum terfulfill

---

## Admin Endpoints (God Only)

**Auth:** JWT + Role `god`

**Prefix:** `/api/v1/orders`

### GET /orders/admin/all

Mendapatkan semua pesanan (all users).

**Response (200):**
```json
[
  {
    "id": "uuid",
    "buyerId": "uuid",
    "buyerName": "John Doe",
    "buyerEmail": "john@example.com",
    "status": "PENDING_PAYMENT_CONFIRMATION",
    "totalCents": 50000,
    "whatsappNumber": "628123456789",
    "paymentNote": null,
    "itemCount": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /orders/admin/:id

Mendapatkan detail pesanan (admin view).

**Response (200):** Sama seperti user detail, dengan tambahan `productImage`, `fulfilled`, dan `stockUnitIds` per item.
