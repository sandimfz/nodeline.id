# Nodeline.id — Dokumentasi Project

Selamat datang di dokumentasi teknis **Nodeline.id**, sebuah platform marketplace digital dengan sistem chat realtime antara pembeli dan admin.

## Daftar Isi

| # | Dokumen | Deskripsi |
|---|---------|-----------|
| 01 | [Overview](./01-overview.md) | Deskripsi project, tujuan, dan tech stack |
| 02 | [Architecture](./02-architecture.md) | Arsitektur sistem, alur data, dan pola desain |
| 03 | [Folder Structure](./03-folder-structure.md) | Penjelasan struktur direktori project |
| 04 | [Setup](./04-setup.md) | Instalasi, prasyarat, dan environment variable |
| 05 | [Auth](./05-auth.md) | Autentikasi & otorisasi (JWT, role, token management) |
| 06 | [API Reference](./06-api-reference/README.md) | Dokumentasi endpoint API per modul |
| 07 | [Components](./07-components.md) | Komponen frontend utama dan fungsinya |
| 08 | [Database Schema](./08-database-schema.md) | Model/tabel database beserta relasinya |
| 09 | [Realtime](./09-realtime.md) | Implementasi WebSocket/Socket.IO chat |
| 10 | [Testing](./10-testing.md) | Cara menjalankan dan menulis test |
| 11 | [Deployment](./11-deployment.md) | Build dan deploy ke production |
| 12 | [Known Issues](./12-known-issues.md) | Bug diketahui dan TODO |

## Ringkasan Project

Nodeline.id adalah platform marketplace untuk produk digital. Sistem ini terdiri dari tiga aplikasi utama:

- **API Backend** — NestJS REST API dengan PostgreSQL, WebSocket realtime, dan storage Cloudflare R2
- **Client Frontend** — Next.js 16 untuk pengguna akhir (pembeli)
- **Admin Panel** — Vite + React 19 SPA untuk admin (penjual/manajer)

## Tech Stack Utama

| Komponen | Teknologi |
|----------|-----------|
| Backend Framework | NestJS 11 |
| Database | PostgreSQL 16+ |
| ORM | Drizzle ORM |
| Frontend (Client) | Next.js 16 + React 19 |
| Frontend (Admin) | Vite 8 + React 19 |
| State Management | TanStack Query + Zustand |
| UI Library | shadcn/ui + Tailwind CSS v4 |
| Realtime | Socket.IO |
| Storage | Cloudflare R2 (S3-compatible) |
| Auth | Passport JWT + Argon2 |
| Encryption | AES-256-GCM (stock content) |
| Package Manager (API) | pnpm |
| Package Manager (Client & Admin) | bun |

## Konvensi Project

- Bahasa code: TypeScript (strict mode)
- Bahasa UI/teks: Bahasa Indonesia
- Format kode: Prettier + ESLint
- Package manager: pnpm (API Backend), bun (Client & Admin)
