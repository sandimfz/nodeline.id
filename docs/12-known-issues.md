# 12. Known Issues & TODO

## Sudah Diperbaiki

Dicatat karena bug-bug ini pernah membingungkan dan bisa terulang di project lain.

### CORS gagal walau `CORS_ORIGINS` sudah benar

**Gejala:** Client (Next.js) berjalan normal, admin panel (SPA) selalu kena CORS. Preflight OPTIONS mengembalikan semua header CORS **kecuali** `Access-Control-Allow-Origin`.

**Penyebab:** Zod `.transform()` di `envValidationSchema` mengubah `CORS_ORIGINS` dari string ke array. Hasilnya disimpan di ConfigService, tapi `process.env.CORS_ORIGINS` jadi kosong setelahnya. `configuration.ts` yang membaca `process.env` mendapat string kosong → array kosong → tidak ada origin yang diizinkan.

**Fix:** Baca via `config.get('CORS_ORIGINS')` (nilai hasil validasi), bukan parse ulang dari `process.env`.

**Pelajaran:** Kalau validate function men-transform env, jangan parse ulang env yang sama di tempat lain.

### Candle data tidak tersimpan (error 42P10)

**Gejala:** Log penuh `Failed to persist candle`, error PostgreSQL `42P10 infer_arbiter_indexes`.

**Penyebab:** Tabel `candles` di production dibuat tanpa composite primary key, sehingga `ON CONFLICT (symbol, interval, timestamp)` tidak menemukan unique index yang cocok. `drizzle-kit push` melaporkan "No changes detected" karena kolomnya memang sudah sesuai — hanya constraint-nya yang hilang.

**Fix:** `ALTER TABLE candles ADD CONSTRAINT candles_pkey PRIMARY KEY (symbol, interval, timestamp);`

**Pelajaran:** `drizzle-kit push` tidak selalu mendeteksi constraint yang hilang. Verifikasi dengan `SELECT conname FROM pg_constraint WHERE conrelid = '<table>'::regclass`.

### User biasa bisa login ke admin panel

**Penyebab:** Admin panel memakai `POST /auth/login` yang universal. Semua endpoint admin memang dilindungi `@Roles('god')`, tapi user tetap bisa masuk dashboard dan melihat semua request gagal 403.

**Fix:** Endpoint terpisah `POST /auth/admin/login` yang memvalidasi role di server.

### WebSocket connect ke `ws://localhost:3000` di production

**Penyebab:** `NEXT_PUBLIC_WS_URL` tidak di-set. Karena prefiks `NEXT_PUBLIC_`, nilainya di-inline saat **build**, bukan runtime — jadi harus ada sebelum build.

### BFF membuang query string

**Gejala:** OAuth callback selalu gagal dengan "Missing authorization code".

**Penyebab:** BFF route handler membangun URL backend dari pathname saja, `?code=...` hilang.

**Fix:** Sertakan `new URL(request.url).search` saat meneruskan.

### Skeleton muncul di setiap navigasi

Penyebab dan solusinya cukup panjang, didokumentasikan terpisah di [15. Smooth UX Rules](./15-smooth-ux-rules.md) §1.

Singkatnya: `loading.tsx` + route dynamic + `refetchOnMount: true` = skeleton di setiap soft navigation, tidak peduli cache sudah ada.

---

## Bug Diketahui

### 1. Index Missing untuk Chat Messages Pagination

**Issue:** Tidak ada index composite pada `(conversation_id, created_at)` di tabel `messages`.
**Dampak:** Query pagination dengan `ORDER BY created_at DESC` akan full-table scan seiring bertambahnya data.
**Fix:** Tambahkan index manual di migrasi:
```sql
CREATE INDEX idx_messages_conversation_created
ON messages (conversation_id, created_at DESC);
```

**Status:** Migrasi `0009_chat_messages_index.sql` sudah ada. Verifikasi sudah ter-apply di production.

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

### 5. Cloudflare Memblokir Crawler AI

**Issue:** `robots.txt` production berisi managed content dari Cloudflare (AI Crawl Control) yang `Disallow: /` untuk GPTBot, ClaudeBot, CCBot, Google-Extended, Bytespider, Amazonbot, Applebot-Extended, dan meta-externalagent. Blok ini disisipkan Cloudflare di **atas** rules dari `app/robots.ts`.

**Dampak:** Situs tidak bisa dirujuk oleh ChatGPT, Claude, Perplexity, atau AI assistant lain. Kalau strategi distribusi mengandalkan visibility di AI search, ini menghalangi.

**Fix:** Cloudflare Dashboard → domain → AI Crawl Control → matikan atau sesuaikan. Bukan bisa diperbaiki dari kode.

**Status:** Keputusan produk, bukan bug. Perlu dipilih sadar apakah mau di-allow.

### 6. OpenNext Tanpa Incremental Cache

**Issue:** `open-next.config.ts` memakai `defineCloudflareConfig()` tanpa opsi `incrementalCache`. Route yang mengandalkan ISR tidak punya tempat penyimpanan di production.

**Dampak:** Route ISR mengembalikan 404. Sudah kejadian pada `app/sitemap.ts` — build menghasilkan cache entry yang benar, tapi request ke `/sitemap.xml` di production menjawab 404 HTML. Diakali dengan `export const dynamic = "force-dynamic"`.

**Fix jangka panjang:** Konfigurasi incremental cache (R2 atau KV) di `open-next.config.ts` supaya ISR benar-benar bisa dipakai:
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
```

**Status:** TODO. Sementara semua route dynamic, jadi belum menghalangi.

### 7. Belum Ada OG Image

**Issue:** Metadata sudah punya `openGraph`, tapi belum ada gambar. Belum ada `app/opengraph-image.tsx` atau file statis `/og-default.png`.

**Dampak:** Link yang di-share ke WhatsApp/Twitter/Discord tampil tanpa gambar preview.

**Fix:** Buat `app/opengraph-image.tsx` memakai `ImageResponse` dari `next/og`, plus varian per-route untuk produk dan API service. Catatan: `ImageResponse` hanya mendukung flexbox, bukan grid.

**Status:** TODO.

### 8. Sitemap Terbatas 100 Item

**Issue:** `app/sitemap.ts` fetch produk dan API service dengan `limit=100` karena API menolak nilai lebih besar (400 "limit must not be greater than 100").

**Dampak:** Kalau katalog melebihi 100 produk, sisanya tidak masuk sitemap.

**Fix:** Paginate di sitemap generator, atau pakai `generateSitemaps()` kalau nanti melebihi 50.000 URL.

**Status:** Belum menghalangi (katalog masih kecil), tapi akan jadi masalah senyap kalau terlewat.

### 9. Halaman Nav yang Belum Ada

**Issue:** Beberapa link nav menunjuk ke halaman yang belum dibuat: `/help`, `/status` (footer sidebar), `/settings`, `/marketplace/cart`.

**Dampak:** 404 saat diklik.

**Status:** Perlu dibuat atau linknya dihapus. `/wallet` dan icon cart di header sudah dihapus.

---

## TODO / Improvement

### Prioritas Tinggi

- [ ] **Unit tests coverage:** Tambahkan test untuk services utama (OrdersService, StockService, PaymentsService, ChatService)
- [ ] **Multi-instance support:** Pindahkan ticket store dan socket registry ke Redis
- [ ] **Proper logging:** Ganti `console.log` dengan Pino/Winston structured logging
- [ ] **Email notifications:** Implementasi email notification (bukan console.log stub) untuk order fulfillment, dll.
- [x] **Rate limit key by user:** Rate limit per-user (50 request/hari) sudah diimplementasikan di `UserDailyLimitGuard` untuk market data API

### Prioritas Sedang

- [ ] **Pagination untuk product catalog:** Saat ini tidak ada pagination untuk GET /products
- [ ] **Search products:** Belum ada endpoint search/filter produk
- [ ] **Sort products:** Belum ada sorting (harga, terbaru, dll.)
- [ ] **Warranty system:** Field `warranty_period_days` dan `max_warranty_claims` sudah ada di schema, tapi belum diimplementasikan
- [x] **Refund flow + Cancel reason:** Admin bisa cancel/refund melalui `POST /orders/admin/:id/cancel` — logic lengkap dengan pengembalian stok. Saat cancel/refund, admin wajib memberikan alasan yang akan dikirim ke pembeli via chat realtime (Socket.IO), dan alasan tersebut juga dicatat di audit log. Response mencakup field `reason` untuk ditampilkan di frontend. Alasan juga disimpan di kolom `cancellationNote` tabel `orders` dan ditampilkan di halaman order pembeli.
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
