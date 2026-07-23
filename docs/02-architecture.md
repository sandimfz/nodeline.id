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
│    Token in localStorage                                │
│    Secret path: /{VITE_ADMIN_LOGIN_PATH}/*              │
└─────────────────────────────────────────────────────────┘
```

## Alur Data Utama

### Alur Checkout & Fulfillment

```
User → Checkout → Order (PENDING_PAYMENT_CONFIRMATION)
                    │
                    ▼
User upload bukti bayar (opsional) via storage endpoint
                    │
                    ▼
Admin konfirmasi payment → POST /payments/confirm
                    │
                    ▼
Order → PAID_PENDING_FULFILLMENT
    ├── Auto-assign stock units (FIFO via FOR UPDATE SKIP LOCKED)
    ├── Jika semua item terpenuhi → FULFILLED
    └── Jika stok kurang → tetap PAID_PENDING_FULFILLMENT
                            │
                            ▼
                    Admin restock → auto-fulfill
```

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
| JWT payload | `sub`, `email`, `role`, `jti` (random jti untuk tracking) |
| File upload | Magic bytes validation + sharp compression |
| API access | CORS terbatas + Helmet + Rate limiting |

## Catatan

- Logging terbatas pada `console.log` — perlu diganti dengan logger terstruktur (Pino/Winston)
- Belum ada caching layer (Redis) — semua query langsung ke PostgreSQL
- Ticket store dan socket registry in-memory — untuk multi-instance perlu Redis
- Audit log notification masih `console.log` stub
- Email notification masih `console.log` stub (lihat `AuditLogService.notify()`)
