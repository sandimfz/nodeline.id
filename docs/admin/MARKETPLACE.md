# Fitur Marketplace — Admin Panel

**Status: ✅ Selesai (v4.0 — Categories + Toast + Security)**  
**Role:** `god` — semua endpoint marketplace admin di-guard `@Roles('god')`  
**Referensi backend:** `api/docs/api/MARKETPLACE.md` di project API

---

## 1. Arsitektur Aplikasi

### 1.1 Komponen Utama

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER (Next.js Client)                      │
│  - Melihat produk (katalog publik)                               │
│  - Checkout & bayar                                              │
│  - Upload bukti bayar                                            │
│  - Lihat konten setelah admin fulfill                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP (Browser → Next.js BFF → API)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS API)                         │
│  http://localhost:3000/api/v1                                    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  Auth    │  │ Products │  │  Orders  │  │    Storage    │   │
│  │  Module  │  │  Module  │  │  Module  │  │    Module     │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Payments │  │  Stock   │  │  Audit   │  │    Users      │   │
│  │  Module  │  │  Module  │  │   Logs   │  │  (via Auth)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP (Vite Proxy → localhost:5173/api/*)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL (Vite + React)                     │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard   │  │   Produk    │  │       Pesanan           │  │
│  │  (live stat) │  │  (CRUD +    │  │  (all orders, filter,   │  │
│  │              │  │   gambar)   │  │   konfirmasi payment)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Pengguna    │  │  Pengaturan │  │    Detail Pesanan       │  │
│  │  (list +     │  │  (edit      │  │  (items, bukti bayar,   │  │
│  │   pagination)│  │   profile)  │  │   manual stock assign)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 BFF (Backend-For-Frontend)

| Aspek | Client (Next.js) | Admin (Vite) |
|---|---|---|
| **Token storage** | httpOnly cookie (BFF) | localStorage |
| **Refresh** | Otomatis via BFF + cookie | Manual via interceptor |
| **BFF** | Next.js Route Handler `/api/v1/bff/*` | Vite proxy `/api/*` |
| **Routing** | App Router (file-based) | react-router-dom |

---

## 2. Flow Lengkap: User Order → Admin Konfirmasi → Fulfillment

### 2.1 Flow Diagram State Machine

```
                          ┌─────────────────────┐
                          │   PRODUK TERSEDIA    │
                          │  (Admin create +     │
                          │   restock konten)     │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   USER CHECKOUT      │
                          │  POST /orders/check  │
                          │   out                │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────────┐
                          │ PENDING_PAYMENT_         │
                          │ CONFIRMATION             │
                          │                          │
                          │ • User sudah checkout    │
                          │ • User bisa upload       │
                          │   bukti bayar            │
                          │ • Admin belum konfirmasi │
                          └──────────┬──────────────┘
                          │                        │
               ┌──────────────────┐   ┌─────────────────────────┐
               │  Upload bukti    │   │  (Langsung konfirmasi)  │
               │  bayar (opsional)│   │                         │
               │  → [BUKTI BAYAR] │   │  Tanpa upload bukti     │
               │  di paymentNote  │   │                         │
               └────────┬─────────┘   └──────────┬──────────────┘
                        │                        │
                        └──────────┬──────────────┘
                                   │
                     ┌─────────────▼────────────────┐
                     │  ADMIN KONFIRMASI PEMBAYARAN  │
                     │  POST /payments/confirm       │
                     │  ─────────────────────────    │
                     │  1. Set PAID_PENDING_         │
                     │     FULFILLMENT               │
                     │  2. Auto-assign stok FIFO     │
                     │     (FOR UPDATE SKIP LOCKED)  │
                     └─────────────┬────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌─────────────────────┐     ┌──────────────────────────┐
        │     FULFILLED       │     │  PAID_PENDING_           │
        │                     │     │  FULFILLMENT             │
        │ • Semua item dapat  │     │                          │
        │   stok              │     │ • Stok kurang untuk      │
        │ • User bisa lihat   │     │   beberapa item          │
        │   konten            │     │ • Menunggu admin restock │
        └─────────────────────┘     └──────────┬───────────────┘
                                               │
                                    ┌──────────▼──────────────┐
                                    │  ADMIN RESTOCK          │
                                    │  POST /admin/:id/       │
                                    │    restock              │
                                    │  ─────────────────      │
                                    │  Auto-fulfill order     │
                                    │  → FULFILLED            │
                                    └──────────┬──────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │     FULFILLED       │
                                    │                     │
                                    │ User lihat konten:  │
                                    │ GET /orders/:id/    │
                                    │   items/:itemId/    │
                                    │   content           │
                                    │ → Konten terdekripsi│
                                    └─────────────────────┘
```

### 2.2 Flow Normal (Happy Path — Stok Cukup)

```
Step 1: Admin buat produk
        POST /products/admin → 201 PRODUK
        (Isi: nama, harga, deskripsi, gambar, dll)

Step 2: Admin restock konten
        POST /products/admin/P/restock → { inserted: 3 }
        (Isi: 3 baris API key → 3 unit AVAILABLE)

Step 3: User checkout
        POST /orders/checkout → 201 ORDER (PENDING_PAYMENT_CONFIRMATION)
        (Isi: 1 item produk P, qty 2)

Step 4: (Opsional) User upload bukti bayar
        POST /storage/upload → { url: "https://r2.n.../img.webp" }
        → [BUKTI BAYAR] url ditambahkan ke paymentNote

Step 5: Admin lihat pesanan di dashboard
        GET /orders/admin/all → AllOrdersPage
        Filter "Menunggu" → lihat order baru

Step 6: Admin konfirmasi pembayaran
        POST /payments/confirm { orderId }
        → Auto-assign 2 unit (FIFO, FOR UPDATE SKIP LOCKED)
        → Semua kebagian stok → { status: "FULFILLED" }

Step 7: User lihat konten
        GET /orders/O/items/I/content → { content: "sk-abc123\nsk-def456" }
```

### 2.3 Flow Stok Habis (Kurang Stok)

```
Step 1-3: Sama seperti flow normal
          → ORDER PENDING_PAYMENT_CONFIRMATION

Step 4: Admin konfirmasi bayar (tapi stok hanya 1 unit, butuh 2)
        POST /payments/confirm { orderId }
        → Assign 1 unit (stok habis)
        → { status: "PAID_PENDING_FULFILLMENT" }

Step 5: Admin lihat di dashboard
        Dashboard → "1 pesanan dibayar — nunggu stok"
        Atau OrderDetailPage → badge "Dibayar — Menunggu Stok"

Step 6: Admin restock
        POST /products/admin/P/restock → { inserted: 5 }
        → Auto-fulfill order PAID_PENDING_FULFILLMENT
        → Order jadi FULFILLED

     ATAU (alternatif)

Step 6: Admin assign manual (pilih unit stok spesifik)
        Di OrderDetailPage → dropdown "Manual Assign"
        Pilih stock unit → POST /stock/assign { orderItemId, stockUnitId }
        → Item terpenuhi

Step 7: User lihat konten
        GET /orders/O/items/I/content → { content: "..." }
```

### 2.4 Flow Multiple Item (Campuran)

```
Order dengan 2 item berbeda:
  - Item A: produk P1, qty 1
  - Item B: produk P2, qty 2

Kondisi: stok P1 cukup (3 unit), stok P2 hanya 1 unit (kurang 1)

Step 1: Admin konfirmasi payment
        POST /payments/confirm { orderId }
        → Item A: dapat 1 unit ✅
        → Item B: hanya dapat 1 unit (kurang 1)
        → { status: "PAID_PENDING_FULFILLMENT" }

Step 2: Item A fulfilled ✅, Item B nunggu stok
        Di OrderDetailPage:
          Item A → badge "Terkirim" (hijau)
          Item B → badge "Belum" (merah)

Step 3: Admin restock P2 → auto-fulfill item B → order FULFILLED ✅
```

### 2.5 Flow Manual Stock Assign (Override FIFO)

```
Kapan perlu: Admin ingin assign unit stok SPESIFIK ke order item tertentu
(biasanya untuk prioritas / order VIP / koreksi kesalahan FIFO)

Di OrderDetailPage:
  - Item yang belum fulfilled → dropdown "X unit tersedia"
  - Isi dropdown: potongan konten (24 karakter pertama)
  - Pilih salah satu → POST /stock/assign { orderItemId, stockUnitId }
  - ✅ Sukses: item jadi fulfilled
  - ❌ Error: tampilkan pesan error dari API

Backend logic:
  POST /stock/assign
  1. Cek order item ada dan milik order ini
  2. Cek stock unit ada, status AVAILABLE, dan milik produk yang sama
  3. Set status → SOLD, buat fulfillment record
  4. Audit log
```

---

## 3. Status Order

### 3.1 Diagram Status

```
PENDING_PAYMENT_CONFIRMATION
  │
  ├── (Admin konfirmasi + stok cukup) → FULFILLED
  │
  └── (Admin konfirmasi + stok kurang) → PAID_PENDING_FULFILLMENT
                                              │
                                              └── (Auto-fulfill saat restock) → FULFILLED
```

### 3.2 Tabel Status

| Status | Label (Admin) | Deskripsi | Apa yang Terjadi | User Bisa Lihat Konten? |
|---|---|---|---|---|
| `PENDING_PAYMENT_CONFIRMATION` | 🔴 Menunggu Pembayaran | User sudah checkout, admin belum konfirmasi | User bisa upload bukti bayar. Admin harus cek & konfirmasi. | ❌ |
| `PAID_PENDING_FULFILLMENT` | 🟡 Dibayar — Nunggu Stok | Pembayaran OK, stok belum cukup | Admin bisa restock (auto-fulfill) atau assign manual dari stock unit yang ada. | ❌ |
| `FULFILLED` | 🟢 Selesai | Semua item ter-assign | User bisa lihat konten via endpoint content. Admin lihat stock unit IDs. | ✅ |
| `REFUNDED` | ⚪ Dikembalikan | (Belum diimplementasi) | — | ❌ |
| `CANCELLED` | ⚪ Dibatalkan | (Belum diimplementasi) | — | ❌ |

---

## 3.5 ⛔ Security: Manual Assign Hanya untuk Order yang Sudah Dibayar

> **Update (v4.0):** Manual stock assign (`POST /stock/assign`) **TIDAK bisa** untuk order yang masih `PENDING_PAYMENT_CONFIRMATION`.

**Alur yang benar:**
```
1. User checkout → PENDING_PAYMENT_CONFIRMATION
2. Admin cek bukti bayar
3. Admin klik "Konfirmasi Pembayaran" → PAID_PENDING_FULFILLMENT
4. Admin assign manual (jika stok auto-fulfill tidak cukup)
```

**Error jika coba assign sebelum bayar:**
```json
{
  "statusCode": 400,
  "message": "Stock hanya bisa di-assign untuk order yang sudah dikonfirmasi pembayaran. Konfirmasi payment dulu.",
  "error": "Bad Request"
}
```

Di frontend, dropdown manual assign **hanya muncul** untuk order `PAID_PENDING_FULFILLMENT`.

---

## 3.6 Toast System

Admin menggunakan **sonner** (sama seperti Next.js client) untuk notifikasi.

### Cara Pakai
```tsx
import { useToast } from "@/lib/toast";

function Komponen() {
  const toast = useToast();

  // Success — hijau, auto-dismiss 4 detik
  toast.success("Produk berhasil ditambahkan");

  // Error — merah, auto-dismiss 4 detik
  toast.error(extractApiError(err));  // pesan dari response API

  // Info — biru
  toast.info("Pembayaran dikonfirmasi, menunggu stok...");

  // Loading — persistent, harus di-dismiss manual
  const id = toast.loading("Menyimpan...");
  toast.dismiss(id);

  // Promise pattern — loading → success/error otomatis
  await toast.promise(saveData(), {
    loading: "Menyimpan...",
    success: "Tersimpan!",
    error: "Gagal menyimpan",
  });
}
```

### Daftar Halaman yang Pakai Toast
| Halaman | Event | Fungsi |
|---|---|---|
| ProductsPage | Create produk | `toast.success()` / `toast.error()` |
| ProductDetailPage | Edit, Restock, Manual Add | `toast.success()` / `toast.error()` |
| OrderDetailPage | Confirm payment, Manual assign | `toast.success()` / `toast.info()` / `toast.error()` |
| AllOrdersPage | Confirm payment (list) | `toast.success()` / `toast.info()` / `toast.error()` |
| SettingsPage | Update profile | `toast.success()` / `toast.error()` |

**Perbedaan dengan sebelumnya:**
- ❌ Inline banner merah/hijau di dalam halaman (harus scroll)
- ✅ **Toast** muncul di top-right, auto dismiss, tidak mengganggu layout

---

## 4. Halaman Admin — Panduan Lengkap

### 4.1 Dashboard (`/dashboard`)

**Tujuan:** Pantau kondisi marketplace secara real-time.

**Yang Ditampilkan:**
| Card | Data | Sumber |
|---|---|---|
| Total Produk | Jumlah semua produk + aktif + stok habis | `GET /products` |
| Pesanan | Jumlah selesai + pending + dibayar | `GET /orders/admin/all` |
| Pengguna | Total user + admin | `GET /auth/admin/users` |
| Revenue | Total pendapatan (dari orders FULFILLED) | `GET /orders/admin/all` |

**Notifikasi:**
- 🟡 Low Stock Alert: jika ada produk OUT_OF_STOCK, muncul card kuning
- 🔴 Pesanan Perlu Konfirmasi: jumlah order PENDING_PAYMENT_CONFIRMATION
- 🟡 Pesanan Nunggu Stok: jumlah order PAID_PENDING_FULFILLMENT

### 4.2 Produk (`/dashboard/products`)

**Fitur:**
| Aksi | Cara | Endpoint |
|---|---|---|
| ➕ Tambah | Klik "Tambah Produk" → isi form → Simpan | `POST /products/admin` |
| ✏️ Edit | Klik nama produk → buka detail → tab Edit | `PATCH /products/admin/:id` |
| 🖼️ Upload Gambar | Tab Edit → Pilih File → upload otomatis | `POST /storage/upload` |
| ❌ Hapus | Klik icon trash → konfirmasi → hapus | `DELETE /products/admin/:id` |

**Validasi Form:**
- Nama: wajib, max 200 karakter
- Harga: dalam sen (contoh: 50000 = Rp 50.000)
- Key/Unit: minimal 1
- Garansi: opsional, dalam hari
- URL Gambar: opsional, paste URL langsung atau upload file

### 4.3 Detail Produk (`/dashboard/products/:id`)

**4 Tab:**

| Tab | Icon | Fungsi | Refresh |
|---|---|---|---|
| Edit Produk | ⚙️ | Edit data produk + upload gambar | Manual |
| Restock | 📦 | Restock batch (teks) + manual (1 unit) | Manual |
| Stok | 👁️ | Lihat semua stock unit + status + konten | 15 detik |
| Pesanan | 📋 | Lihat order pending per produk + bukti bayar | 10 detik |

**Tab Stok:**
- Menampilkan daftar konten yang sudah di-restock (terdekripsi)
- Status: Tersedia (hijau) / Terjual (secondary)
- Summary: "X tersedia / Y total"
- Tooltip hover untuk konten panjang

**Tab Pesanan Pending:**
- Hanya order dengan status PENDING_PAYMENT_CONFIRMATION atau PAID_PENDING_FULFILLMENT
- Kolom "Bukti": parse `[BUKTI BAYAR]` dari paymentNote
- Link WhatsApp langsung ke halaman detail order

### 4.4 Semua Pesanan (`/dashboard/orders`)

**Fitur:**
| Fitur | Cara |
|---|---|
| 📊 Stat Cards | Total, Menunggu, Dibayar, Selesai |
| 🔍 Filter Status | Klik button: Semua / Menunggu / Dibayar / Selesai |
| 🔎 Search | Cari: nama pembeli, email, WhatsApp, ID order |
| ✅ Konfirmasi Langsung | Klik "Konfirmasi" tanpa perlu buka detail |
| 🔗 Detail | Klik icon external link → OrderDetailPage |

**Cara Konfirmasi Pembayaran:**
1. Buka halaman `/dashboard/orders`
2. Filter "Menunggu" untuk lihat semua order pending
3. Klik "Konfirmasi" pada order yang ingin dikonfirmasi
4. Tunggu response: ✅ FULFILLED atau ⏳ PAID_PENDING_FULFILLMENT
5. Data otomatis refresh (polling 15 detik)

### 4.5 Detail Pesanan (`/dashboard/orders/:id`)

**Informasi:**
| Section | Isi |
|---|---|
| Header | ID order (8 digit), status badge, deskripsi status |
| Buyer Info Card | Nama, Email, WhatsApp, Total, Tanggal |
| Payment Info Card | Status, Fulfillment, Update, Bukti Bayar (gambar), Catatan Pembeli |
| Items Table | Produk (gambar + nama + link), Harga, Qty, Subtotal, Status, Stock Unit |
| Error/Success | Banner hasil konfirmasi payment atau assign manual |

**Fitur Khusus:**
| Fitur | Keterangan |
|---|---|
| 🖼️ Payment Proof | Parse `[BUKTI BAYAR] url` dari paymentNote → tampilkan grid gambar |
| ✅ Konfirmasi Payment | Tombol merah (hanya untuk PENDING_PAYMENT_CONFIRMATION) |
| 📦 Manual Stock Assign | Dropdown "X unit tersedia" (hanya untuk item belum fulfilled di order PAID/PENDING) |
| ❌ Error Handling | Banner merah jika assign gagal |

**Cara Manual Stock Assign:**
1. Buka order dengan status PAID_PENDING_FULFILLMENT
2. Scroll ke tabel Items
3. Cari item dengan badge "Belum" (merah)
4. Di kolom "Stock Unit", klik dropdown "X unit tersedia"
5. Pilih unit stok yang ingin di-assign
6. ✅ Banner hijau: "Stok berhasil di-assign!"
7. ❌ Banner merah: pesan error dari API
8. Data otomatis refresh → item jadi fulfilled

### 4.6 Kategori (`/dashboard/categories`)

**Fitur:**
| Aksi | Cara |
|---|---|
| ➕ Tambah | Klik "Tambah Kategori" → dialog → isi nama → Simpan |
| ❌ Hapus | Klik icon trash → konfirmasi → hapus |

**Kategori Tersedia (seed):**
```
Akses Digital · E-Learning · Software & Tools · Gaming · Design Assets · Layanan Premium
```

**Integrasi dengan Produk:**
- Saat create/edit produk, admin bisa pilih kategori dari dropdown
- Dropdown menggunakan `useCategories()` hook (TanStack Query, cache 60 detik)
- Di landing page, category badge muncul di card produk

### 4.7 Pengguna (`/dashboard/users`)

**Stat Cards:** Total, Admin, User Biasa, Email Terverifikasi

**Search:** Cari berdasarkan nama, email, atau role

**Pagination:** 20 user per halaman
- Navigasi: prev / page numbers / next
- Info: "Menampilkan X–Y dari Z pengguna"
- Search reset ke halaman 1

### 4.8 Pengaturan (`/dashboard/settings`)

**Fitur:**
| Aksi | Cara |
|---|---|
| Edit Nama | Input nama → Simpan → `PATCH /auth/me` |
| Lihat Info Akun | Role, Email, Tanggal Bergabung, Verifikasi Email |

**Catatan:** Email tidak bisa diubah. Fitur ganti password akan segera tersedia.

---

## 5. API Endpoints yang Digunakan Admin

### 5.1 Auth & Users

| Method | Endpoint | Fungsi | Halaman |
|---|---|---|---|
| POST | `/auth/login` | Login admin | LoginPage |
| POST | `/auth/refresh` | Refresh token | api-client (auto) |
| POST | `/auth/logout` | Logout | Header dropdown |
| GET | `/auth/me` | Info admin | Dashboard + Settings |
| PATCH | `/auth/me` | Update profile (name) | SettingsPage |
| GET | `/auth/admin/users` | List semua user (god only) | UsersPage |

### 5.2 Kategori

| Method | Endpoint | Fungsi | Halaman |
|---|---|---|---|
| GET | `/categories` | Semua kategori (publik) | CategoriesPage |
| POST | `/categories/admin` | Buat kategori (god only) | CategoriesPage |
| DELETE | `/categories/admin/:id` | Hapus kategori (god only) | CategoriesPage |

### 5.3 Marketplace — Produk

| Method | Endpoint | Fungsi | Halaman |
|---|---|---|---|
| GET | `/products` | Katalog publik | ProductsPage + Dashboard |
| GET | `/products/:id` | Detail produk | ProductDetailPage |
| POST | `/products/admin` | Buat produk | ProductsPage (dialog) |
| PATCH | `/products/admin/:id` | Update produk | ProductDetailPage (edit) |
| DELETE | `/products/admin/:id` | Hapus produk | ProductsPage |
| GET | `/products/admin/:id/pending-orders` | Order pending per produk | ProductDetailPage (tab) |
| POST | `/products/admin/:id/restock` | Restock batch | ProductDetailPage |
| POST | `/products/admin/:id/restock/manual` | Manual restock 1 unit | ProductDetailPage |
| GET | `/products/admin/:id/stock-units` | Lihat stok + konten | ProductDetailPage (tab) |

### 5.4 Marketplace — Orders

| Method | Endpoint | Fungsi | Halaman |
|---|---|---|---|
| GET | `/orders/admin/all` | Semua pesanan (god only) | AllOrdersPage |
| GET | `/orders/admin/:id` | Detail pesanan (god only) | OrderDetailPage |
| POST | `/payments/confirm` | Konfirmasi pembayaran | AllOrdersPage + OrderDetailPage |
| POST | `/stock/assign` | Assign stok manual | OrderDetailPage |

### 5.5 Storage

| Method | Endpoint | Fungsi | Halaman |
|---|---|---|---|
| POST | `/storage/upload` | Upload gambar (produk/bukti bayar) | ProductDetailPage |

---

## 6. Routes & Komponen

| Path | Halaman | Komponen | Auth |
|---|---|---|---|
| `{ADMIN_BASE}` | Login | `LoginPage` | Public |
| `{ADMIN_BASE}/dashboard` | Dashboard | `DashboardPage` | god |
| `{ADMIN_BASE}/dashboard/products` | Produk | `ProductsPage` | god |
| `{ADMIN_BASE}/dashboard/products/:id` | Detail Produk | `ProductDetailPage` | god |
| `{ADMIN_BASE}/dashboard/orders` | Semua Pesanan | `AllOrdersPage` | god |
| `{ADMIN_BASE}/dashboard/orders/:id` | Detail Pesanan | `OrderDetailPage` | god |
| `{ADMIN_BASE}/dashboard/users` | Pengguna | `UsersPage` | god |
| `{ADMIN_BASE}/dashboard/settings` | Pengaturan | `SettingsPage` | god |

---

## 7. Komponen Kode

| Komponen | File | Fungsi |
|---|---|---|
| `ProductForm` | `features/marketplace/components/ProductForm.tsx` | Form create/edit + upload gambar + kategori dropdown |
| `ProductsPage` | `pages/ProductsPage.tsx` | Daftar produk + stat + CRUD |
| `ProductDetailPage` | `pages/ProductDetailPage.tsx` | Detail + 4 tab (Edit, Restock, Stock, Orders) |
| `AllOrdersPage` | `pages/AllOrdersPage.tsx` | Semua pesanan + filter + search |
| `OrderDetailPage` | `pages/OrderDetailPage.tsx` | Detail pesanan + bukti bayar + assign |
| `UsersPage` | `pages/UsersPage.tsx` | List user + pagination |
| `CategoriesPage` | `pages/CategoriesPage.tsx` | CRUD kategori + stats + toast |
| `SettingsPage` | `pages/SettingsPage.tsx` | Edit profile admin |
| `DashboardPage` | `pages/DashboardPage.tsx` | Dashboard real-time stats |

---

## 8. E2E Test Results (22 Juli 2026)

Test flow lengkap telah dijalankan secara langsung pada **22 Juli 2026 pukul 23:00 WIB** dan **100% berhasil**:

### Flow Normal (Stok Cukup)
```
✅ Register user baru: e2e_test_{timestamp}@test.test
✅ Login user baru
✅ Lihat katalog produk (3 produk tersedia)
✅ Checkout produk dengan stok AVAILABLE → PENDING_PAYMENT_CONFIRMATION
✅ Upload bukti bayar (PNG 409B → WebP ~1KB ke Cloudflare R2) — sharp compress
✅ [BUKTI BAYAR] url otomatis di paymentNote saat checkout
✅ Admin login (god@nodeline.id)
✅ Admin cek order: paymentNote + bukti bayar url benar
✅ Admin konfirmasi payment → FULFILLED (stok cukup)
✅ User akses konten via /orders/:id/items/:itemId/content → "key2"
```

### Flow Stok Habis (Kurang Stok)
```
✅ Checkout produk OUT_OF_STOCK → PENDING_PAYMENT_CONFIRMATION
✅ Admin konfirmasi payment → PAID_PENDING_FULFILLMENT
✅ User coba akses konten → 404 "Konten belum tersedia"
  (menunggu admin restock)
```

### Security
```
✅ Anti-IDOR: akses order orang lain → 404
✅ Anti-IDOR: akses konten sebelum fulfill → 404
✅ Manual assign cuma untuk order sudah dibayar (400 kalau masih pending)
✅ Stock assignment pakai FOR UPDATE SKIP LOCKED
✅ Upload validasi format: only JPEG/PNG/WebP (text/plain → 422)
✅ Upload purpose wajib: "product-image" atau "payment-proof" (tanpa → 400)
```

### Frontend Accessibility
```
✅ /marketplace → HTTP 200
✅ /marketplace/[id] → HTTP 200
✅ / → HTTP 200 (landing page)
✅ /auth/login → HTTP 200
✅ /checkout → HTTP 307 (redirect ke login jika belum auth)
```

### Race Condition — Concurrent Payment Confirmation
```
✅ 3 admin confirm payment dikirim PARALEL → semua FULFILLED
✅ 2 user berebut 1 stok terakhir:
   → User A: PAID_PENDING_FULFILLMENT (antri stok)
   → User B: FULFILLED (dapat unit terakhir)
✅ No double-assignment: semua SOLD unit punya ID unik
✅ Stok akurat: 0 tersisa, 11 SOLD
```

### Content Security — Akses Tanpa Bayar
```
✅ User checkout → order PENDING_PAYMENT_CONFIRMATION
✅ User coba akses /orders/:id/items/:id/content
✅ 404 "Konten belum tersedia untuk item ini"
✅ hasContent flag: false (sebelum fulfill)
✅ Tanpa konfirmasi admin, konten TIDAK BISA diakses
```

### Race Condition Protection — FOR UPDATE SKIP LOCKED
```
✅ Dua request confirm payment tidak bisa claim unit yang sama
✅ Jika unit di-lock transaksi A, transaksi B SKIP ke unit berikutnya
✅ Tidak ada deadlock — transaksi tidak saling nunggu
✅ Partial fulfillment: jika stok kurang, order jadi PAID_PENDING_FULFILLMENT
✅ Auto-fulfill setelah restock juga pakai transaction terpisah
```

---

## 9. Fitur Belum Diimplementasi (Backlog)

| Fitur | Alasan | Dampak |
|---|---|---|
| **Warranty / Klaim Garansi** | Backend belum ada endpoint | Tidak bisa handle klaim garansi |
| **Refund** | Backend belum ada endpoint | Tidak bisa refund pembayaran |
| **Review produk** | Backend belum ada endpoint | Tidak ada rating/review |
| **Halaman Audit Log** | Backend belum ada endpoint listing | Tidak bisa lihat histori aktivitas admin |
| **Bulk operations** | - | Hapus/restock harus 1 per 1 |
| **Export CSV/Excel** | - | Tidak ada export data |
| **Notifikasi realtime** | Butuh WebSocket | Perlu refresh manual untuk lihat order baru |
| **Ganti password** | Butuh endpoint baru di backend | Sementara hanya bisa edit nama |
| **Filter produk by kategori** | Belum ada endpoint | Tidak bisa filter produk per kategori di admin |
