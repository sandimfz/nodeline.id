# nodeline.id — Backend Blueprint

> Platform: AI API Key Marketplace, AI Gateway, Akun Pro, Komunitas
> Stack: NestJS + PostgreSQL
> Versi dokumen: 1.0 (Juli 2026)

---

## 1. Ringkasan Project

nodeline.id adalah platform yang menggabungkan beberapa produk dalam satu ekosistem:

- **Marketplace** — jual beli API key, produk digital, akun pro
- **AI Gateway** — proxy request ke provider AI (OpenAI, Anthropic, dll) dengan billing per-token
- **Akun Pro / Subscription** — akses fitur premium berbasis langganan
- **Wallet** — saldo internal untuk transaksi di dalam platform
- **Komunitas** — forum/diskusi antar user

Karena ada uang & credential pihak ketiga yang mengalir di sistem ini, **security dan konsistensi data (terutama transaksi) adalah prioritas nomor satu**, bukan cuma fitur.

---

## 2. Tech Stack Rekomendasi

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | **NestJS** | Sudah dipilih — modular, DI bawaan, cocok untuk arsitektur besar |
| Database | **PostgreSQL** | ACID, cocok untuk data finansial/transaksi |
| ORM | **Drizzle ORM** | Lihat perbandingan di bawah |
| Cache / Rate limit store | **Redis** | Untuk rate limiting per API key, session, queue |
| Queue | **BullMQ** (berbasis Redis) | Untuk proses async: billing, webhook, email |
| Auth | **JWT (access + refresh token)** + **Passport** | Standar NestJS |
| Payment Gateway | Midtrans / Xendit (lokal ID) | Sesuai target market Indonesia |
| Validasi | **class-validator** + **class-transformer** | Bawaan ekosistem NestJS |
| Env validation | **Zod** atau `Joi` via `ConfigModule` | Cegah app jalan dengan env salah |
| Logging | **Pino** (`nestjs-pino`) | Structured logging, cepat |
| Monitoring | Sentry + OpenTelemetry | Error tracking + tracing (penting untuk gateway) |
| Container | Docker + Docker Compose (dev), Kubernetes/VPS (prod) | Standar deployment |

### Drizzle vs Prisma vs TypeORM — kenapa Drizzle?

| Aspek | Drizzle | Prisma | TypeORM |
|---|---|---|---|
| Performa query | Sangat dekat ke SQL native, overhead minim | Ada overhead engine (query engine binary) | Overhead lebih besar, banyak "magic" |
| Kontrol transaction | Eksplisit, mirip SQL langsung — bagus untuk debit/credit wallet | Bagus, tapi lebih "black box" | Kadang tidak konsisten di edge case |
| Migration | `drizzle-kit`, cukup matang, SQL-first | Prisma Migrate, sangat matang & mulus | Ada tapi sering bermasalah di production |
| Type safety | Sangat kuat, inferred langsung dari schema | Kuat, generated client | Lemah dibanding dua lainnya |
| Cocok untuk gateway (low-latency proxy) |  Sangat cocok | Cukup, tapi overhead lebih terasa di high-throughput | Kurang ideal |
| Learning curve | Butuh paham SQL sedikit lebih dalam | DX paling mudah untuk pemula | Menengah |

**Rekomendasi: Drizzle**, karena dua fitur inti nodeline.id (AI Gateway & Wallet) sangat sensitif terhadap latency dan konsistensi transaksi. Kalau tim lebih nyaman dengan DX yang "auto-pilot", Prisma tetap valid pilihan kedua.

---

## 3. Struktur Folder (Modular, Domain-Driven)

```
nodeline-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   ├── configuration.ts          # load & group env vars
│   │   ├── validation.schema.ts      # zod/joi schema untuk env
│   │
│   ├── common/
│   │   ├── decorators/               # @CurrentUser(), @Roles(), dll
│   │   ├── filters/                  # global exception filter
│   │   ├── guards/                   # JwtAuthGuard, RolesGuard, ApiKeyGuard
│   │   ├── interceptors/             # logging, transform response, timeout
│   │   ├── pipes/                    # custom validation pipes
│   │   ├── middleware/               # request-id, raw-body untuk webhook
│   │   ├── dto/                      # pagination dto, response wrapper dto
│   │   ├── constants/
│   │   └── utils/
│   │
│   ├── database/
│   │   └── drizzle/
│   │       ├── schema/               # 1 file per domain: users.schema.ts, wallets.schema.ts, dll
│   │       ├── migrations/
│   │       ├── drizzle.module.ts
│   │       └── drizzle.service.ts    # provider koneksi + helper transaction
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/           # jwt.strategy.ts, refresh.strategy.ts
│   │   │   └── dto/
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.controller.ts     # REST: conversations, messages, ws-ticket
│   │   │   ├── chat.service.ts        # Bisnis logic + ticket registry (in-memory)
│   │   │   ├── chat.gateway.ts        # Socket.IO: realtime messaging, typing, rate limit
│   │   │   └── dto/
│   │   │
│   │   ├── users/
│   │   ├── api-keys/                 # produk API key yang dijual + lifecycle key
│   │   ├── ai-gateway/                # proxy request ke provider AI + usage metering
│   │   ├── marketplace/               # listing produk, order, checkout
│   │   ├── subscriptions/             # akun pro / billing recurring
│   │   ├── wallet/                    # saldo, topup, mutasi, ledger
│   │   ├── payments/                  # integrasi payment gateway + webhook handler
│   │   ├── community/                 # forum, post, comment, like
│   │   ├── notifications/
│   │   └── admin/                     # dashboard internal, moderation
│   │
│   └── health/                        # health check endpoint (untuk load balancer)
│
├── test/
│   ├── unit/
│   └── e2e/
│
├── drizzle.config.ts
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── nest-cli.json
```

**Prinsip:** satu module = satu domain bisnis, self-contained (controller, service, dto, entity/schema-nya sendiri). Jangan taruh logic lintas domain di controller — controller cuma orkestrasi tipis ke service.

---

## 4. Konvensi Penamaan File & Kode

| Jenis | Konvensi | Contoh |
|---|---|---|
| Module | `*.module.ts` | `wallet.module.ts` |
| Controller | `*.controller.ts` | `wallet.controller.ts` |
| Service | `*.service.ts` | `wallet.service.ts` |
| DTO | `*.dto.ts`, PascalCase class | `create-topup.dto.ts` → `CreateTopupDto` |
| Entity/Schema | `*.schema.ts` (Drizzle) | `wallets.schema.ts` |
| Guard | `*.guard.ts` | `api-key.guard.ts` |
| Interceptor | `*.interceptor.ts` | `logging.interceptor.ts` |
| Enum | `*.enum.ts`, UPPER_SNAKE untuk value | `transaction-type.enum.ts` |
| Interface/Type | `*.interface.ts` / `*.type.ts` | `jwt-payload.interface.ts` |
| Test | `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e) | `wallet.service.spec.ts` |
| Folder | kebab-case | `ai-gateway/`, `api-keys/` |
| Env var | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_ACCESS_SECRET` |
| Route path | kebab-case, plural untuk resource | `/api/v1/api-keys`, `/api/v1/wallet/topup` |

---

## 5. Security Checklist

### Auth & Akses
- [ ] JWT access token (short-lived, 15 menit) + refresh token (httpOnly cookie, rotasi setiap dipakai)
- [ ] Password hashing pakai **argon2** (lebih tahan brute-force dibanding bcrypt)
- [ ] RBAC (`RolesGuard`) — role minimal: `user`, `pro`, `admin`, `superadmin`
- [ ] Rate limiting login/register (`@nestjs/throttler`) untuk cegah brute-force & credential stuffing
- [ ] 2FA opsional (TOTP) untuk akun dengan saldo besar / admin

### API Key & Gateway (kritis!)
- [ ] API key pihak ketiga (misal OpenAI key yang disimpan sistem untuk proxy) **dienkripsi AES-256-GCM** sebelum masuk DB, bukan plaintext
- [ ] API key yang **diterbitkan nodeline.id ke user** disimpan sebagai hash (mirip Stripe: `nl_live_xxxx`, simpan hash + 6-8 karakter prefix untuk lookup/identifikasi di dashboard)
- [ ] Setiap API key attach ke rate-limit & quota individual (per key, bukan cuma per user)
- [ ] Revoke/rotate key harus instant (invalidate cache Redis, bukan cuma tandai di DB)
- [ ] Log akses API key (siapa, kapan, endpoint apa) tanpa mencatat key itu sendiri

### Transaksi & Wallet
- [ ] Semua mutasi saldo pakai **DB transaction** (row lock / `SELECT ... FOR UPDATE`) — cegah race condition saldo dobel
- [ ] Idempotency key wajib di endpoint topup/payment (cegah double-charge saat retry)
- [ ] Ledger append-only (jangan pernah `UPDATE` saldo langsung, selalu insert baris mutasi lalu hitung saldo dari situ atau simpan snapshot balance terverifikasi)
- [ ] Webhook payment gateway **wajib verifikasi signature** sebelum diproses
- [ ] Reconciliation job harian: cocokkan saldo internal vs data payment gateway

### Umum / Infrastruktur
- [ ] Helmet + CORS whitelist origin (jangan `*`)
- [ ] HTTPS only + HSTS di production
- [ ] Validasi input ketat via `class-validator` di semua DTO, `whitelist: true` di `ValidationPipe` (buang field yang tidak dikenal)
- [ ] Secrets di `.env` untuk dev, **secret manager** (Vault/Doppler/AWS Secrets Manager) untuk production — jangan pernah commit `.env`
- [ ] Redact field sensitif (password, token, api key) dari log
- [ ] `npm audit` / Snyk di CI untuk scan dependency vulnerable
- [ ] Global exception filter — jangan bocorkan stack trace ke response production
- [ ] Backup DB otomatis + test restore berkala

---

## 6. Feature Checklist

### Auth & User
- [ ] Register/login (email + password)
- [ ] OAuth (Google/GitHub) — opsional fase 2
- [ ] Refresh token rotation
- [ ] Forgot/reset password
- [ ] Email verification
- [ ] Profile management

### API Key Marketplace
- [ ] Listing produk API key (per provider: OpenAI, Anthropic, dll)
- [ ] Generate & issue API key ke buyer setelah pembayaran
- [ ] Quota/limit per key (jumlah request / token)
- [ ] Dashboard usage per key (grafik pemakaian)
- [ ] Revoke / regenerate key

### AI Gateway
- [ ] Proxy endpoint universal (`/v1/gateway/:provider/*`) ke provider asli
- [ ] Usage metering (hitung token in/out per request)
- [ ] Billing otomatis dari metering ke wallet/subscription
- [ ] Rate limit per API key & per tier (free/pro)
- [ ] Fallback/load balancing antar provider (opsional, fase lanjut)
- [ ] Caching response untuk request identik (opsional, hemat biaya)

### Chat Realtime
- [x] WebSocket Gateway (Socket.IO, namespace `/chat`)
- [x] REST endpoints: conversations, messages, read, close, ws-ticket
- [x] One-time ticket authentication untuk WS handshake
- [x] Anti-IDOR: validasi ownership conversation di setiap event
- [x] Rate limit per-socket: 10 pesan / 10 detik
- [x] Auto-assign admin ke conversation saat pertama balas
- [x] Unread count per user/admin
- [x] In-memory socket registry + ticket store

### Marketplace Umum
- [ ] Listing produk (akun pro, produk digital lain)
- [ ] Cart / checkout flow
- [ ] Order history
- [ ] Review/rating produk

### Subscription / Akun Pro
- [ ] Plan tier (Free, Pro, Business)
- [ ] Billing recurring (integrasi payment gateway)
- [ ] Auto-downgrade saat gagal bayar
- [ ] Invoice/receipt

### Wallet
- [ ] Topup (via payment gateway)
- [ ] Withdraw (jika berlaku)
- [ ] Riwayat mutasi (ledger)
- [ ] Transfer saldo antar user (opsional)

### Komunitas
- [ ] Forum/thread (CRUD post)
- [ ] Komentar & like
- [ ] Moderasi konten (report, hide)
- [ ] Notifikasi mention/reply

### Admin & Ops
- [ ] Dashboard admin (user, transaksi, produk)
- [ ] Moderation tools (ban, suspend)
- [ ] Audit log aktivitas sensitif
- [ ] Health check endpoint (`/health`) untuk load balancer

### DevOps / Kualitas
- [ ] CI pipeline (lint, test, build)
- [ ] Docker Compose untuk dev environment (app + Postgres + Redis)
- [ ] Unit test untuk service kritis (wallet, gateway billing)
- [ ] E2E test untuk flow pembayaran
- [ ] API documentation (Swagger via `@nestjs/swagger`)

---

## 7. Urutan Pengerjaan yang Disarankan

1. **Fondasi**: setup NestJS, config module, Drizzle + PostgreSQL, Docker Compose
2. **Auth module** lengkap (JWT, refresh, guard, RBAC dasar)
3. **Wallet module** (ledger, transaction handling) — dibangun awal karena semua fitur lain bergantung ke sini
4. **API Key marketplace** (issue key, quota, revoke)
5. **AI Gateway** (proxy + metering + billing ke wallet)
6. **Subscription/Pro** (integrasi payment recurring)
7. **Marketplace umum** & **Komunitas** (fitur pelengkap, bisa paralel)
8. **Admin dashboard** & hardening security menyeluruh sebelum go-live

---

*Catatan: dokumen ini adalah starting point. Sesuaikan detail schema & endpoint saat implementasi berjalan.*