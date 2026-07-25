# Feature: API Directory

## Deskripsi

Halaman **API Directory** adalah katalog curated untuk API services yang disediakan oleh platform Nodeline. User dapat menjelajahi, mencoba (free tier), dan berlangganan akses ke berbagai API. Ini bukan open marketplace — hanya admin (god) yang bisa menambah/mengelola API services.

## Tujuan

- Menyediakan katalog API yang tersedia di platform Nodeline
- User bisa mencoba API gratis (free tier) sebelum berlangganan
- User bisa berlangganan plan berbayar untuk limit yang lebih tinggi
- Admin (god) bisa menambah/mengelola API yang tersedia
- 1 API key bisa dipakai lintas service (subscription per service)

## Arsitektur Key & Subscription

### Model: 1 Key → Many Services

```
User → api_keys (1 atau lebih key) → api_subscriptions (per service)
                                          │
                                          ├── service: Trading API, plan: FREE
                                          ├── service: Movie API, plan: PRO
                                          └── service: Utility API, plan: FREE
```

Setiap request ke API:
1. Guard extract API key dari header
2. Lookup subscription untuk (key, target service)
3. Cek plan limits (rate per minute + quota per day) **per (key, service)**
4. Forward request ke service handler

### Kenapa bukan 1 Key = 1 Service?

- UX lebih baik: user tidak perlu manage banyak key
- Mirip pola RapidAPI: 1 key universal, billing per service
- Quota & rate limit tetap isolated per service (tidak saling ganggu)

## User Flow

### Visitor / User (tidak perlu login untuk browsing)

```
/api-directory
  │
  ├── Lihat daftar API yang tersedia (card grid)
  │     - Nama API, Logo
  │     - Deskripsi singkat
  │     - Kategori (Trading, Entertainment, Utility, dll.)
  │     - Pricing badge (Free / Freemium / Paid)
  │     - Status (Active / Maintenance)
  │
  └── Klik API card → /api-directory/[slug]
        │
        ├── Overview tab
        │     - Deskripsi lengkap
        │     - Base URL
        │     - Available endpoints list
        │     - Pricing plans (Free, Pro, Enterprise)
        │     - Rate limits per plan
        │
        ├── Endpoints tab
        │     - List semua endpoint (method + path + description)
        │     - Request/Response example per endpoint
        │     - Try it (playground — server-side execution, key never exposed to browser)
        │
        ├── Pricing tab
        │     - Plan comparison table
        │     - Requests/day limit
        │     - Features per plan
        │     - CTA: "Mulai Gratis" / "Upgrade"
        │
        └── Documentation tab
              - Authentication guide
              - Code examples (cURL, JS, Python)
              - Error codes reference
```

### Subscribe Flow

```
User klik "Mulai Gratis" pada Trading API
  │
  ├── Cek: service status === ACTIVE && is_published === true
  │     └── Jika tidak → tolak dengan error
  │
  ├── Cek: sudah ada active subscription untuk (user, service)?
  │     └── Jika ya → tampilkan "Sudah berlangganan" + link manage
  │
  ├── Cek: user punya API key?
  │     ├── Ya → pakai key existing
  │     └── Tidak → generate key baru (one-time reveal pattern)
  │
  └── Buat subscription: (key_id, service_id, plan_id, status: ACTIVE)
        └── Return: API key (hanya saat baru dibuat) + subscription info
```

### Upgrade Flow

```
User klik "Upgrade ke Pro"
  │
  ├── Buat order via sistem payment existing (manual confirm oleh admin)
  │     └── Catatan: ini trade-off sadar — tidak instant activation
  │     └── Order note berisi: "Upgrade [service_name] ke plan [plan_name]"
  │
  ├── Admin konfirmasi payment
  │     └── Trigger: update subscription plan_id
  │
  └── Alternatif (Phase 3): payment gateway + webhook → auto-activate
```

### Downgrade / Cancel

```
User cancel subscription
  │
  ├── Set subscription status → CANCELLED
  ├── Quota hari ini tetap berlaku sampai reset (00:00 UTC)
  └── Key tetap ada (bisa dipakai untuk service lain yang masih active)

User downgrade PRO → FREE
  │
  ├── Update plan_id ke FREE plan
  ├── Quota reset ke limit FREE sejak saat itu
  └── Jika usage hari ini sudah melebihi FREE limit → rate limited sampai besok
```

## Data Model

### Tabel: `api_services`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| slug | varchar(100) | URL-friendly, unique, format: `^[a-z0-9-]+$` |
| name | varchar(200) | Nama API |
| description | text | Deskripsi lengkap (markdown, sanitized saat render) |
| short_description | varchar(300) | Deskripsi singkat untuk card |
| category | varchar(50) | Kategori (trading, entertainment, utility, etc.) |
| base_url | varchar(500) | Base URL API (harus endpoint yang di-guard ApiKeyGuard) |
| logo_url | varchar(500) | Logo/icon API |
| pricing_type | enum | FREE, FREEMIUM, PAID |
| status | enum | ACTIVE, MAINTENANCE, DEPRECATED |
| version | varchar(20) | Versi API (e.g., "v1") |
| is_published | boolean | Tampilkan di directory |
| sort_order | integer | Urutan tampilan |
| created_at | timestamp | |
| updated_at | timestamp | |

### Tabel: `api_endpoints`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| service_id | uuid | FK → api_services |
| method | varchar(10) | GET, POST, PUT, DELETE |
| path | varchar(200) | Endpoint path (e.g., "/prices/{symbol}") |
| summary | varchar(300) | Deskripsi singkat |
| description | text | Deskripsi lengkap (markdown, sanitized) |
| request_example | jsonb | Contoh request body |
| response_example | jsonb | Contoh response |
| is_premium | boolean | Hanya untuk plan berbayar |
| sort_order | integer | |

### Tabel: `api_plans`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| service_id | uuid | FK → api_services |
| name | varchar(50) | FREE, PRO, ENTERPRISE |
| price_cents | integer | Harga per bulan (0 untuk free) |
| requests_per_day | integer | NULL = unlimited (bukan -1) |
| requests_per_minute | integer | Rate limit/menit |
| features | jsonb | Array fitur yang termasuk |
| is_active | boolean | |
| sort_order | integer | |

**Catatan:** `requests_per_day: NULL` = unlimited. Guard wajib handle ini eksplisit di satu tempat (rate-limit interceptor). Tidak boleh tersebar.

### Tabel: `api_subscriptions` (BARU — pengganti relasi langsung api_keys → plan)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| api_key_id | uuid | FK → api_keys |
| service_id | uuid | FK → api_services |
| plan_id | uuid | FK → api_plans |
| status | enum | ACTIVE, CANCELLED, SUSPENDED |
| quota_used_today | integer | Counter usage hari ini |
| quota_reset_at | timestamp | Kapan quota di-reset (00:00 UTC besok) |
| created_at | timestamp | |
| updated_at | timestamp | |
| cancelled_at | timestamp | Null jika masih aktif |

**Unique constraint:** `(api_key_id, service_id)` — 1 key hanya bisa punya 1 active subscription per service.

### Perubahan tabel existing: `api_keys`

| Perubahan | Detail |
|-----------|--------|
| Hapus `plan` column | Plan sekarang di-track via `api_subscriptions` |
| Hapus `allowed_symbols` | Pindah ke scopes per-service (opsional, Phase 2) |
| Hapus `rate_limit_per_min` | Sekarang derived dari plan di subscription |
| Tetap | `id, user_id, name, key_prefix, hashed_key, is_active, last_used_at, expires_at, created_at, revoked_at` |

**Migrasi bertahap:** Phase 1 tambah tabel baru + biarkan kolom lama. Phase 2 migrasi data + hapus kolom deprecated.

## Security

### API Key Handling
- Hash key (SHA256), constant-time compare, masking di log — sama seperti existing
- `POST /subscribe` yang generate key baru → one-time reveal (key ditampilkan sekali, tidak bisa di-retrieve lagi)
- Revocation instan — set `is_active: false` langsung block semua service

### Playground (Phase 2)
- Request dieksekusi **server-side** (BFF/backend yang pegang key)
- Browser hanya kirim parameter, dapat response balik
- Key **tidak pernah** ter-expose ke client JavaScript
- Pattern sama dengan WS ticket di fitur chat

### Rate Limiting
- Public browsing endpoints (`GET /api-services`, `/endpoints`, `/plans`) → rate limit per IP (100/menit)
- Subscribe endpoint → rate limit per user (5/menit)
- API execution → rate limit per (key, service) sesuai plan

### Input Validation
- Slug: enforce `^[a-z0-9-]+$` (regex validation di DTO)
- Markdown content dari admin: sanitize saat render (no raw HTML passthrough)
- `base_url`: harus endpoint yang sudah di-guard ApiKeyGuard

### Subscribe Validation
- Tolak jika service `status !== ACTIVE` atau `is_published === false`
- Tolak jika sudah ada active subscription untuk (user, service) → idempotent
- Tolak jika plan `is_active === false`

## UI Components

### API Directory Page (`/api-directory`)

```
┌─────────────────────────────────────────────────────┐
│  Header: "API Directory"                            │
│  Subtitle: "Temukan dan gunakan API untuk project"  │
│                                                     │
│  [Search input]  [Filter: Kategori ▼] [Sort ▼]     │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ 📈      │  │ 🎬      │  │ 🔧      │            │
│  │ Trading │  │ Movie   │  │ Utility │            │
│  │ API     │  │ API     │  │ API     │            │
│  │         │  │         │  │         │            │
│  │ Real... │  │ Film... │  │ URL ... │            │
│  │         │  │         │  │         │            │
│  │ FREE-   │  │ FREE    │  │ PAID    │            │
│  │ MIUM    │  │         │  │         │            │
│  │         │  │         │  │         │            │
│  │ [Lihat] │  │ [Lihat] │  │ [Lihat] │            │
│  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────┘
```

### API Detail Page (`/api-directory/[slug]`)

```
┌─────────────────────────────────────────────────────┐
│  [Logo] Trading API  v1                    [Active] │
│  Real-time forex, crypto, and stock data            │
│                                                     │
│  Base URL: https://api.sandimf.dev/api/v1/public    │
│                                                     │
│  [Overview] [Endpoints] [Pricing] [Docs]            │
│  ─────────────────────────────────────────          │
│                                                     │
│  (tab content here)                                 │
│                                                     │
│  ┌────────────────────────────────────────┐         │
│  │  Mulai Gratis                          │         │
│  │  60 requests/menit • 1000 requests/hari│         │
│  │  [Dapatkan API Key]                    │         │
│  └────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────┘
```

## Routing

| Path | Deskripsi |
|------|-----------|
| `/api-directory` | Katalog semua API (public, paginated) |
| `/api-directory/[slug]` | Detail API + endpoints + pricing |

## API Endpoints (Backend)

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api-services` | Public (rate limited) | List API, `?category=&search=&page=&limit=` |
| GET | `/api-services/:slug` | Public (rate limited) | Detail API by slug |
| GET | `/api-services/:slug/endpoints` | Public (rate limited) | List endpoints |
| GET | `/api-services/:slug/plans` | Public (rate limited) | List plans |
| POST | `/api-services/:slug/subscribe` | JWT | Subscribe ke plan (idempotent) |
| PATCH | `/api-services/:slug/subscription` | JWT | Upgrade/downgrade plan |
| DELETE | `/api-services/:slug/subscription` | JWT | Cancel subscription |
| POST | `/api-services/admin` | JWT + God | Create API service |
| PATCH | `/api-services/admin/:id` | JWT + God | Update API service |
| DELETE | `/api-services/admin/:id` | JWT + God | Delete API service |

## Status Implementasi

### Sudah selesai (Phase 1)

**Backend:**
- Schema: `api_services`, `api_endpoints`, `api_plans`, `api_subscriptions`
- Public endpoints: list (paginated, single-query dengan `count(*) over()`), detail by slug, endpoints, plans
- Subscribe flow: idempotent, validasi status, one-time key reveal
- Admin CRUD + `GET /api-services/admin` (melihat service unpublished)
- `ServiceStatusGuard` — menolak request ke `/market/*` saat service dinonaktifkan dari admin
- Rate limiting di semua endpoint publik

**Client:**
- `/api-directory` — card grid dengan prefetch-on-hover ke detail
- `/api-directory/[slug]` — tabs Overview, Endpoints, Pricing, Docs
- Prefetch + HydrationBoundary (lihat `15-smooth-ux-rules.md`)

**Admin:**
- `/dashboard/api-services` — toggle publikasi, ubah status dan pricing type, optimistic UI

**Seed:**
- `api/scripts/seed-api-directory.ts` — Trading API dengan 3 plan dan 5 endpoint

### Belum dikerjakan

- API playground (server-side execution)
- Usage dashboard per subscription
- Plan upgrade via checkout
- Scopes per service (pengganti `allowed_symbols`)
- Payment gateway (instant activation)

---

## Kontrol On/Off dari Admin

Toggle di admin bukan sekadar menyembunyikan API dari listing — endpoint publiknya benar-benar ditutup.

`ServiceStatusGuard` (di `PublicApiModule`) membaca `is_published` dan `status` dari `api_services` dengan slug `trading`:

| Kondisi | Response `/api/v1/market/*` |
|---|---|
| `is_published: false` | 503 "API sedang dinonaktifkan" |
| `status: MAINTENANCE` | 503 "API sedang dalam pemeliharaan" |
| `status: DEPRECATED` | 503 "API sudah tidak didukung" |
| `status: ACTIVE` + published | Diteruskan ke guard berikutnya |

Detail implementasi:
- Status di-cache in-memory **30 detik** — tanpa ini setiap request API menambah satu query DB
- Lookup yang gagal **fail-open** — masalah DB tidak boleh mematikan API
- Kalau service belum ada di directory, guard membiarkan lewat (API ini ada sebelum directory dibuat)

Guard dipasang **paling awal** dalam chain, sebelum `ApiKeyGuard` — tidak ada gunanya validasi key kalau service-nya memang dimatikan.

---

## Cara Menambah API Baru

### Via seed script

Duplikasi pola di `api/scripts/seed-api-directory.ts`, lalu:

```bash
cd api && node --import tsx --env-file=.env scripts/seed-api-directory.ts
```

### Via admin API

```bash
TOKEN=$(curl -s -X POST https://api.sandimf.dev/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<password>"}' | jq -r '.accessToken')

curl -X POST https://api.sandimf.dev/api/v1/api-services/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "slug": "movie",
    "name": "Movie Database API",
    "shortDescription": "Search movies, TV shows, actors",
    "category": "entertainment",
    "baseUrl": "https://api.sandimf.dev/api/v1/public/movie",
    "pricingType": "FREE",
    "isPublished": true
  }'
```

Lalu tambahkan plans dan endpoints via `POST /api-services/admin/:id/plans` dan `.../endpoints`.

**Catatan:** Kalau API baru butuh guard on/off sendiri, buat guard baru meniru `ServiceStatusGuard` dengan slug yang sesuai — jangan hardcode banyak slug di satu guard.

---

## Prioritas Implementasi

### Phase 1 — MVP
- [ ] Data model + migrations (api_services, api_endpoints, api_plans, api_subscriptions)
- [ ] Backend: public listing + detail endpoints (paginated, filtered)
- [ ] Backend: subscribe flow (idempotent, validate status)
- [ ] Backend: admin CRUD
- [ ] Refactor rate-limit guard untuk subscription-based (per key+service)
- [ ] Client: `/api-directory` page (card grid, search, filter)
- [ ] Client: `/api-directory/[slug]` page (tabs: overview, endpoints, pricing, docs)
- [ ] Seed Trading API sebagai first entry (data sudah ada)
- [ ] Migrasi `api_keys` → `api_subscriptions` (backward compatible)

### Phase 2 — Enhanced
- [ ] API playground (server-side execution, key not exposed)
- [ ] Usage dashboard per subscription
- [ ] Plan upgrade via checkout + admin confirm
- [ ] Admin panel: API service management page
- [ ] Code snippets generator (cURL, JS fetch, Python requests)
- [ ] Scopes per service (replace `allowed_symbols`)

### Phase 3 — Advanced
- [ ] Payment gateway integration (instant activation)
- [ ] API versioning
- [ ] Webhook subscriptions
- [ ] SDK auto-generation
- [ ] API changelog
- [ ] Review/rating system

