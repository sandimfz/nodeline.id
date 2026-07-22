# nodeline.id — Admin Panel

**Stack:** Vite 8 + React 19 + TypeScript + Zustand + TanStack Query v5 + shadcn/ui (Base UI) + Tailwind CSS v4  
**Backend:** NestJS di `http://localhost:3000/api/v1`  
**Package Manager:** Bun

---

## Ringkasan

Admin panel untuk mengelola marketplace nodeline.id. Berbeda dengan client user (Next.js BFF), admin menggunakan **Vite proxy** + **localStorage** untuk token.

```
Browser Admin → /api/* (Vite Proxy) → http://localhost:3000/api/v1/*
```

### Perbedaan dengan Client (Next.js)

| Aspek | Client (Next.js User) | Admin (Vite) |
|---|---|---|
| **Token storage** | httpOnly cookie (BFF) | localStorage |
| **Refresh** | Otomatis via BFF + cookie | Manual via interceptor |
| **BFF** | Next.js Route Handler `/api/v1/bff/` | Vite dev proxy `/api/` |
| **Prefetch** | Server-side (RSC) | TanStack Query staleTime |
| **Routing** | App Router (file-based) | react-router-dom |

### Struktur Folder

```
admin/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # AppShell, Sidebar, Header, Theme
│   │   └── auth/            # AuthInit, ProtectedRoute
│   ├── features/
│   │   ├── auth/            # Login, logout, me (api + hooks + types + schema)
│   │   └── marketplace/     # Produk, orders, categories, users, storage
│   ├── stores/
│   │   └── auth-store.ts    # Zustand (persisted) — token + user
│   ├── lib/
│   │   ├── api-client.ts    # Axios instance + interceptor
│   │   ├── query-keys.ts    # Query key factory
│   │   ├── toast.ts         # Sonner toast wrapper (useToast)
│   │   └── utils.ts         # cn() utility
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── AllOrdersPage.tsx
│   │   ├── OrderDetailPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── ForbiddenPage.tsx
│   ├── App.tsx              # Router setup
│   └── main.tsx             # Entry point
├── docs/
│   ├── ADMIN.md             # Dokumentasi arsitektur
│   ├── 1.Auth.md            # Auth implementation detail
│   └── MARKETPLACE.md       # Marketplace admin guide
└── vite.config.ts           # Proxy configuration
```

### Halaman Admin

| Path | Halaman | Deskripsi |
|---|---|---|
| `{ADMIN_BASE}` | Login | Login admin |
| `{ADMIN_BASE}/dashboard` | Dashboard | Real-time stats |
| `{ADMIN_BASE}/dashboard/products` | Produk | CRUD produk |
| `{ADMIN_BASE}/dashboard/products/:id` | Detail Produk | 4 tab: Edit, Restock, Stock, Orders |
| `{ADMIN_BASE}/dashboard/orders` | Pesanan | All orders + filter + search |
| `{ADMIN_BASE}/dashboard/orders/:id` | Detail Pesanan | Items, bukti bayar, assign |
| `{ADMIN_BASE}/dashboard/users` | Pengguna | List + pagination |
| `{ADMIN_BASE}/dashboard/categories` | Kategori | CRUD kategori |
| `{ADMIN_BASE}/dashboard/settings` | Pengaturan | Edit profile |

### Tech Stack

| Kategori | Pustaka | Versi |
|---|---|---|
| Framework | React + Vite | 19 + 8 |
| Routing | react-router-dom | ^7 |
| State (server) | TanStack Query | v5 |
| State (client) | Zustand | v5 |
| HTTP | axios | ^1 |
| Validasi | Zod | ^4 |
| UI Library | shadcn/ui (base-ui) | — |
| Icons | lucide-react | ^1.25 |
| Toast | sonner | — |
| CSS | Tailwind CSS | v4 |
| CLI | Bun | — |

### Scripts

```bash
bun dev           # Start dev server (port 5173)
bun run build     # Build production
bun run preview   # Preview build
bun run typecheck # TypeScript check
```

### Lihat Juga

- [`docs/ADMIN.md`](docs/ADMIN.md) — arsitektur & setup
- [`docs/1.Auth.md`](docs/1.Auth.md) — implementasi Auth
- [`docs/MARKETPLACE.md`](docs/MARKETPLACE.md) — panduan marketplace admin
- [API docs](../api/docs/) — dokumentasi backend NestJS
- [Client docs](../client/docs/) — dokumentasi frontend user

---

*Dokumen ini diperbarui: 22 Juli 2026*
