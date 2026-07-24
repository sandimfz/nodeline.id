# 04. Setup

## Prasyarat

| Requirement | Minimal | Catatan |
|-------------|---------|---------|
| Node.js | 20.x | Tested on v22.x |
| pnpm | 9.x | Package manager (API Backend) |
| bun | 1.x | Package manager (Client & Admin) |
| PostgreSQL | 16.x | Database |
| Cloudflare R2 | - | Untuk image storage (opsional untuk development) |

## Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd nodeline.id
```

### 2. Install Dependencies

```bash
# API Backend
cd api && pnpm install

# Client Frontend
cd ../client && bun install

# Admin Panel
cd ../admin && bun install
```

> **Catatan:** Project ini belum menggunakan pnpm workspace. Setiap app memiliki `node_modules` sendiri. API Backend menggunakan `pnpm`, sedangkan Client dan Admin menggunakan `bun`.

### 3. Setup Database

```bash
# Buat database PostgreSQL
createdb nodeline

# Generate dan apply migrations
cd api
pnpm db:generate
pnpm db:push

# (Opsional) Seed user god/admin
pnpm seed:god
```

### 4. Environment Variables

Copy file `.env.example` ke masing-masing app (file `.env.example` belum tersedia — lihat template di bawah).

---

## Environment Variables

### API Backend (`api/.env`)

```env
# App
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:3001,http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nodeline

# JWT
JWT_ACCESS_SECRET=<min-16-chars-random-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<min-16-chars-random-string>
JWT_REFRESH_EXPIRES_IN=30d

# Cookie
REFRESH_COOKIE_NAME=nl_refresh
COOKIE_SECURE=false
COOKIE_SAMESITE=strict

# Stock Encryption (64 hex chars = 32 bytes)
STOCK_ENCRYPTION_KEY=<64-hex-chars>

# Cloudflare R2 (opsional untuk development)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=nodeline-images
R2_ACCOUNT_ID=
R2_PUBLIC_URL=
R2_UPLOAD_EXPIRES_IN=600
```

### Client Frontend (`client/.env.local`)

```env
# API Backend URL (untuk server-side fetch)
API_BASE_URL=http://localhost:3000/api/v1

# Session cookie name (harus sama dengan api)
SESSION_COOKIE_NAME=nl_session

# WebSocket URL
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

### Admin Panel (`admin/.env`)

```env
# Secret path untuk admin panel (acak!)
VITE_ADMIN_LOGIN_PATH=iasniaguiagsiashas

# API Backend target (untuk Vite proxy)
API_TARGET=http://localhost:3000
```

---

## Menjalankan Development

### Terminal 1 — API Backend

```bash
cd api
pnpm start:dev
# Server berjalan di http://localhost:3000
```

### Terminal 2 — Client Frontend

```bash
cd client
bun dev
# Server berjalan di http://localhost:3001
```

### Terminal 3 — Admin Panel

```bash
cd admin
bun dev
# Server berjalan di http://localhost:5173
# Admin panel: http://localhost:5173/{VITE_ADMIN_LOGIN_PATH}/
```

---

## Verifikasi Setup

```bash
# Health check API
curl http://localhost:3000/api/v1/health
# Response: { "status": "ok", "timestamp": "..." }

# Cek katalog produk (public)
curl http://localhost:3000/api/v1/products
# Response: []

# Cek admin panel
open http://localhost:5173/{VITE_ADMIN_LOGIN_PATH}/
```

---

## Scripts Penting

### API

| Script | Deskripsi |
|--------|-----------|
| `pnpm start:dev` | Development dengan watch mode |
| `pnpm build` | Build production |
| `pnpm start:prod` | Menjalankan production build |
| `pnpm db:generate` | Generate migrasi dari schema |
| `pnpm db:push` | Push migrasi ke database |
| `pnpm db:studio` | Buka Drizzle Studio (GUI database) |
| `pnpm seed:god` | Seed user god/admin |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests |

### Client

| Script | Deskripsi |
|--------|-----------|
| `bun dev` | Development server |
| `bun run build` | Production build |
| `bun run start` | Menjalankan production build |
| `bun run lint` | ESLint check |

### Admin

| Script | Deskripsi |
|--------|-----------|
| `bun dev` | Development server |
| `bun run build` | Production build (tsc + vite) |
| `bun run typecheck` | TypeScript type checking |
| `bun run preview` | Preview production build |
| `bun run lint` | ESLint check |
| `bun run format` | Prettier format |
