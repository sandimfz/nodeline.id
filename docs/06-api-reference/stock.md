# Stock API

**Prefix:** `/api/v1/stock`

**Auth:** JWT + Role `god`

---

## POST /stock/assign

Manual assign stock unit ke order item. Wajib dilakukan setelah payment dikonfirmasi.

**Request:**
```json
{
  "orderItemId": "uuid",
  "stockUnitId": "uuid"
}
```

**Validasi:**
- Order item exists
- Order harus sudah `PAID_PENDING_FULFILLMENT` (payment sudah dikonfirmasi)
- Stock unit exists + masih `AVAILABLE`
- Stock unit milik produk yang sama dengan order item

**Response (200):**
```json
{
  "message": "Stock unit di-assign"
}
```

**Error (400):** Order belum dikonfirmasi payment, stock unit tidak tersedia, atau mismatch produk
