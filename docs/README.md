# Nodeline.id — Dokumentasi Project

Selamat datang di dokumentasi teknis **Nodeline.id**, platform marketplace digital dengan chat realtime, API Directory, dan Market Data API.

## Daftar Isi

### Fondasi

| # | Dokumen | Deskripsi |
|---|---------|-----------|
| 01 | [Overview](./01-overview.md) | Deskripsi project, tujuan, dan fitur |
| 02 | [Architecture](./02-architecture.md) | Arsitektur sistem, alur data, dan pola desain |
| 03 | [Folder Structure](./03-folder-structure.md) | Penjelasan struktur direktori project |
| 04 | [Setup](./04-setup.md) | Instalasi, prasyarat, dan environment variable |
| 05 | [Auth](./05-auth.md) | Autentikasi & otorisasi (JWT, OAuth, role, token) |
| — | [API Reference](./api-reference/README.md) | Dokumentasi endpoint API per modul |
| 07 | [Components](./07-components.md) | Komponen frontend utama dan fungsinya |
| 08 | [Database Schema](./08-database-schema.md) | Model/tabel database beserta relasinya |
| 09 | [Realtime](./09-realtime.md) | Implementasi WebSocket/Socket.IO chat |
| 10 | [Testing](./10-testing.md) | Cara menjalankan dan menulis test |
| 11 | [Deployment](./11-deployment.md) | Build dan deploy ke production |
| 12 | [Known Issues](./12-known-issues.md) | Bug diketahui dan TODO |

### Fitur

| # | Dokumen | Deskripsi |
|---|---------|-----------|
| 13 | [Market Data Architecture](./13-market-data-architecture.md) | Integrasi TradingView, candle aggregation, scanner |
| 14 | [API Directory](./14-api-directory.md) | Katalog API, subscription, plans, admin control |

### Performa & Kualitas

| # | Dokumen | Deskripsi |
|---|---------|-----------|
| 15 | [Smooth UX Rules](./15-smooth-ux-rules.md) | **Aturan project ini** untuk navigasi tanpa delay/skeleton. Baca sebelum menambah halaman. |
| — | [Prefetch Rules](./rule-prefetch.md) | Aturan prefetch TanStack Query (generic) |
| — | [Frontend Perf Checklist](./08-frontend-performance-checklist-generic.md) | Checklist bundle, image, font, virtualization (generic) |
| — | [Skeleton Diagnostic](./09-debug-skeleton-loading-diagnostic.md) | Panduan diagnosis skeleton yang masih muncul (generic) |

## Ringkasan Project

Nodeline.id terdiri dari tiga aplikasi:

- **API Backend** (`api/`) — NestJS REST API + WebSocket, PostgreSQL, Cloudflare R2
- **Client Frontend** (`client/`) — Next.js 16 untuk pengguna akhir, deploy ke Cloudflare Workers
- **Admin Panel** (`admin/`) — Vite + React 19 SPA, deploy ke Cloudflare Workers

Fitur utama: marketplace produk digital (konten terenkripsi), chat realtime, API Directory dengan subscription, dan Market Data API (forex/saham/crypto dari TradingView).

## Tech Stack Utama

| Komponen | Teknologi |
|----------|-----------|
| Backend Framework | NestJS 11 |
| Database | PostgreSQL (Supabase, region Asia) |
| ORM | Drizzle ORM |
| Frontend (Client) | Next.js 16 + React 19 |
| Frontend (Admin) | Vite 8 + React 19 |
| State Management | TanStack Query + Zustand |
| UI Library | shadcn/ui (base style) + Tailwind CSS v4 |
| Realtime | Socket.IO |
| Storage | Cloudflare R2 (S3-compatible) |
| Auth | Passport JWT + Argon2 + OAuth (Google, GitHub) |
| Encryption | AES-256-GCM (stock content) |
| Deployment | Cloudflare Workers (client & admin), VPS + Cloudflare Tunnel (API) |
| Package Manager (API) | pnpm |
| Package Manager (Client & Admin) | bun |

## Konvensi Project

- Bahasa code: TypeScript (strict mode)
- Bahasa UI/teks: Bahasa Indonesia
- Format kode: Prettier + ESLint
- Package manager: pnpm (API), bun (Client & Admin)
- Icon library: `@tabler/icons-react` (client), `lucide-react` (admin)
- Git: fitur/fix dikerjakan di branch, bukan langsung ke `main`
