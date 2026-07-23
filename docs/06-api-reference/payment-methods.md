# Payment Methods API

**Prefix:** `/api/v1/payment-methods`

---

## Public Endpoints

### GET /payment-methods

Mendapatkan metode pembayaran yang aktif.

**Auth:** None (public)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "type": "qris",
    "name": "QRIS Nodeline",
    "imageUrl": "https://r2.dev/...",
    "accountNumber": null,
    "accountName": null,
    "isActive": true,
    "sortOrder": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Types:** `bank_transfer` | `qris`

---

## Admin Endpoints (God Only)

**Prefix:** `/api/v1/payment-methods/admin`

**Auth:** JWT + Role `god`

### GET /payment-methods/admin

Mendapatkan semua metode pembayaran (termasuk non-aktif).

**Response (200):** Array of PaymentMethod

### POST /payment-methods/admin

Membuat metode pembayaran baru.

**Request:**
```json
{
  "type": "bank_transfer",
  "name": "BCA Nodeline",
  "imageUrl": "https://r2.dev/...",
  "accountNumber": "1234567890",
  "accountName": "PT Nodeline",
  "isActive": true,
  "sortOrder": 0
}
```

**Response (201):** PaymentMethod object

### PATCH /payment-methods/admin/:id

Update metode pembayaran.

**Request:** Partial fields

**Response (200):** Updated PaymentMethod object

### DELETE /payment-methods/admin/:id

Hapus metode pembayaran.

**Response (200):** `{ "message": "Metode pembayaran dihapus" }`
