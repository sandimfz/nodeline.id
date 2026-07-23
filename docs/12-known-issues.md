# 12. Known Issues & TODO

## Bug Diketahui

### 1. Index Missing untuk Chat Messages Pagination

**Issue:** Tidak ada index composite pada `(conversation_id, created_at)` di tabel `messages`.
**Dampak:** Query pagination dengan `ORDER BY created_at DESC` akan full-table scan seiring bertambahnya data.
**Fix:** Tambahkan index manual di migrasi:
```sql
CREATE INDEX idx_messages_conversation_created
ON messages (conversation_id, created_at DESC);
```

**Status:** Belum diperbaiki. Drizzle tidak support partial index definitions di DDL.

### 2. Payment Method Image Upload Purpose

**Issue:** Fungsi `uploadPaymentImage` di admin menggunakan `purpose: "product-image"` untuk upload gambar payment method, padahal seharusnya ada purpose khusus.
**Dampak:** Gambar payment method tunduk pada validasi product-image (800-1080px, rasio 1:1-3:4).
**Status:** Perlu diperbaiki — tambahkan purpose `payment-method-image` atau gunakan endpoint terpisah.

### 3. Admin Chat Tidak Menggunakan WebSocket

**Issue:** Admin panel (Vite SPA) menggunakan REST untuk mengirim pesan, bukan Socket.IO.
**Dampak:** Admin tidak menerima pesan baru secara realtime kecuali melakukan polling.
**Status:** Sementara dianggap cukup karena admin perlu refresh halaman. Untuk realtime penuh, admin perlu implementasi Socket.IO client juga.

### 4. Ticket Store & Socket Registry In-Memory

**Issue:** Kedua store menggunakan Map in-memory di `ChatService`.
**Dampak:** Jika deploy dengan multi-instance, ticket yang dibuat di instance A tidak valid di instance B. User yang terdaftar di instance A tidak bisa di-disconnect dari instance B.
**Fix:** Pindahkan ke Redis.
**Status:** TODO.

---

## TODO / Improvement

### Prioritas Tinggi

- [ ] **Unit tests coverage:** Tambahkan test untuk services utama (OrdersService, StockService, PaymentsService, ChatService)
- [ ] **Multi-instance support:** Pindahkan ticket store dan socket registry ke Redis
- [ ] **Proper logging:** Ganti `console.log` dengan Pino/Winston structured logging
- [ ] **Email notifications:** Implementasi email notification (bukan console.log stub) untuk order fulfillment, dll.
- [ ] **Rate limit key by user:** Saat ini rate limit per-IP, perlu per-user untuk endpoint authenticated

### Prioritas Sedang

- [ ] **Pagination untuk product catalog:** Saat ini tidak ada pagination untuk GET /products
- [ ] **Search products:** Belum ada endpoint search/filter produk
- [ ] **Sort products:** Belum ada sorting (harga, terbaru, dll.)
- [ ] **Warranty system:** Field `warranty_period_days` dan `max_warranty_claims` sudah ada di schema, tapi belum diimplementasikan
- [ ] **Refund flow:** Status REFUND_REQUESTED dan REFUNDED sudah ada di enum, tapi belum ada endpoint/logic
- [ ] **Admin avatar:** Fitur avatar untuk admin (saat ini hanya user)
- [ ] **Multiple product images:** Saat ini hanya satu `imageUrl` per produk
- [ ] **Mobile responsive untuk admin panel:** Belum optimal di layar kecil

### Prioritas Rendah

- [ ] **Docker setup:** Buat Dockerfile + docker-compose.yml
- [ ] **CI/CD pipeline:** GitHub Actions untuk test + build + deploy
- [ ] **pnpm workspace:** Migrasi ke workspace monorepo (saat ini setiap app standalone)
- [ ] **API versioning:** Strategi untuk API versioning (v1, v2, dll.)
- [ ] **OpenAPI/Swagger:** Belum ada dokumentasi API otomatis
- [ ] **.env.example:** Belum ada file contoh di setiap app
- [ ] **Rate limiting untuk admin endpoints:** Beberapa admin endpoints belum di-throttle

---

## Catatan Keamanan

- [ ] **Pastikan** `STOCK_ENCRYPTION_KEY` di-rotate secara periodik
- [ ] **Pastikan** `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` di-generate dengan random aman
- [ ] **Pastikan** `VITE_ADMIN_LOGIN_PATH` diubah dari default sebelum production
- [ ] **Pastikan** cookie `SECURE=true` dan `SAMESITE=strict` di production
- [ ] **Review** CORS origins — pastikan hanya origin yang diperlukan
- [ ] **Review** rate limit values — sesuaikan dengan traffic aktual
