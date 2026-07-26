# 02. Architecture

## Arsitektur Keseluruhan

Project Nodeline.id menggunakan arsitektur **monorepo** dengan tiga aplikasi terpisah yang saling terhubung:

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User)                        │
│  Next.js 16 App (client/)                               │
│    ├── SSR pages (server components)                    │
│    ├── Client components (React 19)                     │
│    └── TanStack Query cache                             │
└───────────────┬───────────────────────────┬─────────────┘
                │ BFF Proxy                 │ WS (Socket.IO)
                │ /api/v1/bff/*             │ /chat namespace
                ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                NestJS Backend (api/)                     │
│    Global prefix: /api/v1                               │
│    ├── Auth Module (JWT + refresh tokens)               │
│    ├── Marketplace Module                               │
│    │   ├── Products (public + admin CRUD)               │
│    │   ├── Orders (checkout + fulfillment)              │
│    │   ├── Payments (confirm + auto-assign)             │
│    │   ├── Stock (encrypted units management)           │
│    │   ├── Storage (R2 image upload)                    │
│    │   ├── Categories                                   │
│    │   └── Payment Methods                              │
│    └── Chat Module (REST + WebSocket Gateway)           │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│    Drizzle ORM — schema-based migrations                │
│    Tables: users, products, orders, stock_units,        │
│            conversations, messages, audit_logs, etc.     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                Cloudflare R2 (Storage)                   │
│    S3-compatible object storage                         │
│    Images: product images, payment proofs, avatars       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Admin Panel (admin/)                   │
│    Vite 8 SPA — React 19                                │
│    Proxy via Vite dev server: /api → NestJS             │
│    Token in memory + httpOnly cookie                     │
│    Secret path: /{VITE_ADMIN_LOGIN_PATH}/*              │
└─────────────────────────────────────────────────────────┘
```

## Alur Data Utama

### Alur Checkout & Fulfillment

```
User → Checkout → Order (PENDING_PAYMENT_CONFIRMATION)
                    │
                    ├── Admin cancel (dengan alasan via chat) → CANCELLED
                    │
                    ▼
User upload bukti bayar (opsional) via storage endpoint
                    │
                    ▼
Admin konfirmasi payment → POST /payments/confirm
                    │
                    ├── Admin cancel (dengan alasan via chat) → CANCELLED
                    │
                    ▼
Order → PAID_PENDING_FULFILLMENT
    ├── Auto-assign stock units (FIFO via FOR UPDATE SKIP LOCKED)
    ├── Jika semua item terpenuhi → FULFILLED
    └── Jika stok kurang → tetap PAID_PENDING_FULFILLMENT
                            │
                            ├── Admin refund (dengan alasan via chat) → REFUNDED (stok dikembalikan)
                            │
                            ▼
                    Admin restock → auto-fulfill
```

**Ringkasan Status Transitions:**
```
PENDING_PAYMENT_CONFIRMATION  ──(confirm payment)──→  PAID_PENDING_FULFILLMENT ──(auto-fulfill)──→  FULFILLED
         │                                                      │                                               │
         └──(admin cancel + chat)──→  CANCELLED                └──(admin cancel + chat)──→  CANCELLED         └──(admin refund + chat)──→  REFUNDED
```

**Catatan:** Saat admin melakukan cancel/refund, wajib memberikan alasan yang akan dikirim ke pembeli melalui chat realtime (Socket.IO). Sistem akan mencari percakapan aktif pembeli atau membuatnya baru, lalu mengirim pesan notifikasi sebelum status pesanan diubah.

### Alur Chat Realtime

```
User → POST /chat/ws-ticket → dapat one-time ticket (30s expiry)
       │
       ▼
User connect Socket.IO /chat dengan ticket
       │
       ▼
Gateway validasi ticket → attach userId + role ke socket
       │
       ▼
User join room `conv:{conversationId}`
       │
       ▼
Send message via event `message:send`
    ├── Rate limit (10 msg / 10 detik)
    ├── Save ke DB
    ├── Broadcast ke room via `message:new`
    └── Ack ke sender via `message:ack` (optimistic UI reconcile)
```

## Pola Desain

| Pattern | Lokasi | Keterangan |
|---------|--------|------------|
| **Module** | `api/src/modules/` | NestJS module per fitur |
| **Repository** | `drizzle.service.ts` | Single source of truth untuk DB queries |
| **Strategy** | `strategies/jwt-access.strategy.ts` | Passport strategy untuk JWT |
| **Guard** | `guards/*.ts` | NestJS guards untuk otorisasi |
| **Decorator** | `decorators/*.ts` | Custom decorators (CurrentUser, Roles) |
| **Provider** | `payments/providers/` | Payment provider interface + implementations |
| **Interceptor** | `ClassSerializerInterceptor` | Global interceptor untuk @Exclude() |
| **BFF** | `client/app/api/v1/bff/[...path]` | Backend-for-Frontend pattern |
| **Singleton** | Socket registry + ticket store | In-memory maps di ChatService |
| **Factory** | `QueryClient` | TanStack Query client creation |

## Keamanan Data

| Data | Metode |
|------|--------|
| Password | Argon2id (memoryCost=19456, timeCost=2) |
| Refresh token | SHA256 hash (raw token tidak pernah disimpan) |
| Stock content | AES-256-GCM (key 32 byte dari env) |
| Session client | httpOnly cookie untuk refresh token |
| Session admin | Access token memory-only (Zustand), refresh via httpOnly cookie |
| OAuth CSRF | Signed state parameter (HMAC-SHA256) + httpOnly cookie |
| JWT payload | `sub`, `email`, `role`, `jti` (random jti untuk tracking) |
| File upload | Magic bytes validation + sharp compression |
| API access | CORS terbatas + Helmet + Rate limiting |

## Modul Market Data (Public API)

Nodeline juga menyediakan **Market Data API** untuk data pasar real-time (forex, saham, crypto) yang diambil dari TradingView.

Lihat dokumentasi lengkap arsitektur backend-nya di:
- [13. Market Data Architecture — TradingView Integration](./13-market-data-architecture.md) — alur data, WS protocol, OHLC aggregation, persistence, scanner, rate limiting
- [API Reference: Market Data](./api-reference/market-data.md) — endpoint documentation untuk customer

### Diagram Alur Data

```
TradingView (WS) ──► TradingViewSocketService ──► (event: tradingview.tick)
                                                         │
                                                         ├──► CandleBuilderService ──► CandleRepository ──► PostgreSQL
                                                         │
                                                         └──► PublicApiController (SSE stream)

TradingView (Scanner REST) ──► TradingViewScannerService ──► PublicApiController

PublicApiController ──► TradingViewSocketService.getSnapshot() ──► Response
PublicApiController ──► CandleBuilderService.getCandles() ──► Response
```

## Catatan

- Logging via Pino (structured logger)
- Belum ada caching layer di API (Redis) — tapi ada edge cache di BFF untuk endpoint publik (lihat `15-smooth-ux-rules.md` §5)
- Ticket store dan socket registry in-memory — untuk multi-instance perlu Redis
- Audit log notification masih `console.log` stub
- Email notification masih `console.log` stub (lihat `AuditLogService.notify()`)
- Market Data WebSocket client adalah singleton — untuk multi-instance perlu Redis pub/sub

## Modul API Directory

Katalog API services yang bisa di-browse publik dan di-subscribe user. Lihat [14. API Directory](./14-api-directory.md).

```
Client (/api-directory)
    │
    ▼
ApiDirectoryController (public, rate limited)
    ├── GET /api-services              → list published (paginated)
    ├── GET /api-services/:slug        → detail + endpoints + plans
    └── POST /api-services/:slug/subscribe → generate/reuse API key + subscription

ApiDirectoryAdminController (JWT + god)
    ├── GET    /api-services/admin     → list SEMUA termasuk unpublished
    ├── POST   /api-services/admin     → create service
    ├── PATCH  /api-services/admin/:id → update (termasuk toggle isPublished/status)
    └── DELETE /api-services/admin/:id → delete
```

### Kontrol On/Off dari Admin

Admin panel (`/dashboard/api-services`) bisa mengaktifkan/menonaktifkan API. Ini bukan hanya menyembunyikan dari listing — `ServiceStatusGuard` di `PublicApiModule` menolak request ke endpoint publik:

| Kondisi di admin | Response `/api/v1/market/*` |
|---|---|
| `isPublished: false` | 503 "API sedang dinonaktifkan" |
| `status: MAINTENANCE` | 503 "API sedang dalam pemeliharaan" |
| `status: DEPRECATED` | 503 "API sudah tidak didukung" |
| `status: ACTIVE` + published | Normal |

Status di-cache in-memory 30 detik agar tidak menambah query DB per request. Lookup yang gagal fail-open — masalah DB tidak mematikan API.

## Autentikasi OAuth

Selain email/password, tersedia login via Google dan GitHub. Lihat [05. Auth](./05-auth.md).

```
Client → GET /auth/oauth/{provider}          → { url } + set nl_oauth_state cookie (signed state)
       → redirect ke provider (state di URL)
       → provider redirect ke /auth/callback/{provider}?code=...&state=...
       → GET /auth/oauth/{provider}/callback → validate state (HMAC + cookie), exchange code, issue tokens
```

User yang login OAuth dengan email belum terdaftar akan **otomatis dibuat**. Kalau email sudah terdaftar, account di-link (`oauthProvider` + `oauthId` ditambahkan ke user existing).

## Performa & Caching

Keputusan arsitektur terkait kecepatan didokumentasikan terpisah di [15. Smooth UX Rules](./15-smooth-ux-rules.md). Ringkasan:

- **Edge cache di BFF** — endpoint GET publik di-cache di Cloudflare Cache API (60s–5 menit), hanya untuk request tanpa session cookie
- **Single-query pagination** — `count(*) over()` menggantikan query COUNT terpisah
- **Prefetch on hover** — nav link dan card memanggil `prefetchQuery` saat hover, sehingga navigasi terasa instan
- **`refetchOnMount: false`** — revisit halaman render dari cache, tidak refetch
- **Tidak ada `loading.tsx`** untuk route yang datanya di-handle TanStack Query
