# nodeline.id — Client (Next.js)

Frontend untuk nodeline.id marketplace. Stack: **Next.js 16 + TypeScript + TanStack Query + Zustand + shadcn/ui (Base UI) + Tailwind CSS v4**.

---

## Ringkasan

Client adalah aplikasi Next.js App Router yang menggunakan pola **BFF (Backend-for-Frontend)**:

```
Browser → /api/v1/bff/{path} → Next.js Route Handler → NestJS API (port 3000)
```

Semua request API melewati BFF proxy yang mengelola:
- httpOnly cookie `nl_session` — access token JWT
- httpOnly cookie `nl_refresh` — refresh token opaque (rotasi & reuse detection)

### Struktur Projek

```
client/
├── app/
│   ├── (app)/              # Layout utama (header, footer, auth-aware)
│   ├── (auth)/             # Auth layout (login, register)
│   ├── api/v1/bff/[...path]/route.ts  # BFF Route Handler
│   ├── marketplace/        # Halaman marketplace publik
│   ├── page.tsx            # Landing page
│   └── layout.tsx          # Root layout + providers
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Header, Footer, Hero
│   ├── dashboard/          # AppShell, Sidebar, Header, etc.
│   ├── marketplace/        # Card produk, dll
│   └── auth/               # Auth init
├── features/
│   ├── auth/               # Tipe, API, hooks, schema auth
│   └── marketplace/       # Tipe produk
├── hooks/
├── lib/
│   ├── api-client.ts       # Fetch wrapper BFF + auto-refresh
│   ├── bff-server.ts       # Server-side fetch (SSR prefetch)
│   ├── query-keys.ts       # Query key factory
│   └── utils.ts
├── stores/
│   └── auth-store.ts       # Zustand — user + accessToken
└── proxy.ts                # Middleware route protection
```

### Route Protection (Middleware)

- `/dashboard`, `/orders`, `/checkout` → redirect ke `/auth/login` jika belum login
- `/auth/*` → redirect ke `/dashboard` jika sudah login
- Berbasis `nl_session` cookie (httpOnly)

### Tech Stack

| Kategori | Pustaka |
|---|---|
| Framework | Next.js 16 (Turbopack) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Validasi | Zod ^4 |
| UI Library | shadcn/ui (Base UI) |
| Icons | lucide-react |
| CSS | Tailwind CSS v4 |
| Animated Toast | @beui/animated-toast-stack |
| Font | Geist (default Next.js) |

### Scripts

```bash
bun dev          # Start dev server (port 3000)
bun run build    # Build production
bun run lint     # ESLint
```

### Halaman

| Route | Deskripsi | Status |
|---|---|---|
| `/` | Landing page | Selesai |
| `/auth/login` | Login | Selesai |
| `/auth/register` | Register | Selesai |
| `/dashboard` | Dashboard user | Selesai |
| `/dashboard/profile` | Profil user | Selesai |
| `/marketplace` | Katalog produk | Selesai |
| `/marketplace/[id]` | Detail produk + beli | Selesai |
| `/checkout?product=[id]` | Checkout + upload bukti bayar | Selesai |
| `/orders` | Riwayat pesanan | Selesai |
| `/orders/[id]` | Detail pesanan + viewer konten | Selesai |

### Fitur Marketplace (Client)

- **Server-side prefetch** — produk di-fetch saat SSR, tidak ada loading spinner
- **Card produk** — image/gradient fallback, stock status badge, category badge
- **Harga** — format Rp otomatis (contoh: 50000 → Rp 50.000)
- **Detail produk** — link dari card → `/marketplace/[id]` dengan info lengkap + buy button
- **Checkout form** — input WhatsApp, upload bukti bayar (PNG/JPEG/WebP), notes
- **Order history** — otomatis polling tiap 15 detik, status badges
- **Order detail** — viewer konten terenkripsi setelah FULFILLED
- **BFF Proxy** — `/api/v1/bff/*` → forward ke `API_BASE_URL/*`

### BFF Prefix

Semua request API melewati BFF di `/api/v1/bff/{path}`:

```
/api/v1/bff/auth/login      → forward ke /api/v1/auth/login
/api/v1/bff/auth/me         → forward ke /api/v1/auth/me
/api/v1/bff/products        → forward ke /api/v1/products
/api/v1/bff/orders/checkout → forward ke /api/v1/orders/checkout
```

Cookie `nl_refresh` di-set dengan path `/api/v1/bff` — scope terbatas ke BFF saja.

### Lihat Juga

- [`docs/1.Auth.md`](docs/1.Auth.md) — implementasi Auth frontend
- [`docs/2.Marketplace.md`](docs/2.Marketplace.md) — implementasi Marketplace frontend
- [API docs](../api/docs/) — dokumentasi backend NestJS
- [Admin docs](../admin/docs/) — dokumentasi admin panel

---

*Dokumen ini diperbarui: 22 Juli 2026*
