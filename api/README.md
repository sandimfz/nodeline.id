# nodeline.id — API

Backend for nodeline.id: AI API Key Marketplace, AI Gateway, Akun Pro, Wallet, dan Komunitas. Stack: **NestJS + PostgreSQL + Drizzle ORM**.

> Blueprint lengkap: [`docs/BACKEND.md`](docs/BACKEND.md) — tech stack, struktur folder, security checklist, dan urutan pengerjaan.

## Status

Modul pertama — **Auth** — sudah berjalan. Lihat detail di [`docs/1.Auth.md`](docs/1.Auth.md) dan referensi API di [`docs/api/AUTH.md`](docs/api/AUTH.md).

Yang sudah ada:

- Auth: register, login, refresh (rotation + reuse detection), logout, me
- Password hashing argon2id; refresh token opaque + hash sha256 di DB; JWT access token (15m)
- httpOnly cookie untuk refresh token (sameSite=strict)
- `JwtAuthGuard` + `RolesGuard` (global), decorator `@CurrentUser()` & `@Roles()`
- Rate limiting via `@nestjs/throttler` (in-memory)
- Helmet, CORS whitelist, global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`)
- Drizzle ORM + migration; env validation dengan zod
- Unit + e2e tests
- **Marketplace (core flow):** produk (CRUD + katalog publik), **kategori** (CRUD + filter), restock `.txt` + manual, checkout, konfirmasi payment manual → auto-assign stok (FIFO, `FOR UPDATE SKIP LOCKED`), delivery konten anti-IDOR, audit log ringan + notif stub, upload gambar & bukti bayar (Cloudflare R2 + kompresi server-side sharp → WebP). Role admin = `god`. Konten `StockUnit` terenkripsi AES-256-GCM.

Ditunda: forgot/reset password, email verification, warranty, refund, review.

### Categories
- Tabel `categories` (id, name, slug, createdAt)
- FK `category_id` di tabel `products`
- LEFT JOIN otomatis — response public produk include `categoryName`
- Public: `GET /categories` (tanpa auth)
- Admin: `POST /categories/admin`, `DELETE /categories/admin/:id` (god only)

## Prasyarat

- Node 22+, pnpm
- PostgreSQL (lokal, default `127.0.0.1:5432`)

## Setup

1. Buat role & database Postgres (jalan via superuser, mis. `postgres`):

   ```sql
   CREATE ROLE nodeline LOGIN PASSWORD 'nodeline_dev';
   CREATE DATABASE nodeline_api OWNER nodeline;
   ```

2. Salin env dan isi:

   ```bash
   cp .env.example .env
   # generate JWT secret:
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Install dependency:

   ```bash
   pnpm install
   ```

4. Terapkan migrasi DB:

   ```bash
   pnpm db:push     # atau psql "$DATABASE_URL" -f src/database/drizzle/migrations/0000_tricky_stardust.sql
   ```

## Menjalankan

```bash
pnpm start:dev        # hot-reload
# atau build lalu jalan produksi:
pnpm build && node --env-file=.env dist/src/main.js
```

App dengar di `http://localhost:3000`, prefix `/api/v1`.

## Test

```bash
pnpm test            # unit
pnpm test:e2e        # e2e (butuh DB + .env)
pnpm lint            # eslint
```

## Struktur

```
src/
├── main.ts                      # bootstrap: prefix, helmet, CORS, ValidationPipe, global guards
├── app.module.ts                # ConfigModule, ThrottlerModule, DrizzleModule, AuthModule
├── config/                      # configuration.ts + validation.schema.ts (zod)
├── database/drizzle/
│   ├── drizzle.service.ts       # pool + transaction helper
│   ├── drizzle.module.ts
│   ├── schema/                  # users, refresh-tokens
│   └── migrations/
└── modules/auth/                # controller, service, dto, strategies, guards, decorators, interfaces
```

## Dokumentasi

- [`docs/BACKEND.md`](docs/BACKEND.md) — blueprint
- [`docs/1.Auth.md`](docs/1.Auth.md) — spec & checklist Auth (termasuk "Implementasi Aktual")
- [`docs/api/AUTH.md`](docs/api/AUTH.md) — referensi endpoint Auth
- [`docs/api/MARKETPLACE.md`](docs/api/MARKETPLACE.md) — referensi endpoint Marketplace

## Lisensi

UNLICENSED.
