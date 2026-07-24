# Payments API

**Prefix:** `/api/v1/payments`

**Auth:** JWT + Role `god`

---

## POST /payments/confirm

Konfirmasi pembayaran order. Setelah dikonfirmasi, sistem auto-assign stock units.

**Request:**
```json
{
  "orderId": "uuid"
}
```

**Alur:**
1. Validasi order exists + status `PENDING_PAYMENT_CONFIRMATION`
2. Update status ke `PAID_PENDING_FULFILLMENT`
3. Auto-assign stock units untuk setiap item (FIFO via `FOR UPDATE SKIP LOCKED`)
4. Jika semua item terpenuhi, status jadi `FULFILLED`
5. Jika stok kurang, tetap `PAID_PENDING_FULFILLMENT` (auto-fulfill saat restock)

**Response (200):**
```json
{
  "status": "FULFILLED"
}
```

**Error (400):** Order sudah dikonfirmasi sebelumnya atau tidak dalam status yang tepat
**Error (404):** Order tidak ditemukan
