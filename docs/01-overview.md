# 01. Overview

## Deskripsi Project

**Nodeline.id** adalah platform marketplace digital yang memungkinkan pengguna membeli produk digital (seperti template, key, link, dll.) dengan sistem pembayaran manual yang dikonfirmasi oleh admin. Platform ini juga menyediakan fitur chat realtime antara pembeli dan admin untuk mendukung layanan pelanggan.

## Tujuan

- Menyediakan platform jual-beli produk digital dengan alur yang aman dan transparan
- Konten produk (key, link, dll.) dienkripsi AES-256-GCM dan hanya didekripsi setelah pembayaran dikonfirmasi
- Chat realtime untuk mendukung komunikasi pembeli-admin
- Admin panel terpisah untuk manajemen produk, stok, pesanan, dan pengguna

## Role Pengguna

| Role | Deskripsi |
|------|-----------|
| `user` | Pembeli — bisa melihat katalog, checkout, chat dengan admin |
| `god` | Admin — bisa mengelola produk, stok, konfirmasi pembayaran, chat dengan semua user |

## Aplikasi dalam Project

### 1. API Backend (`api/`)
- NestJS 11 REST API
- Global prefix: `/api/v1`
- Database: PostgreSQL via Drizzle ORM
- Storage: Cloudflare R2 (S3-compatible)
- Realtime: Socket.IO namespace `/chat`
- Autentikasi: JWT access token + opaque refresh token (sha256 hashed)

### 2. Client Frontend (`client/`)
- Next.js 16 dengan App Router
- BFF (Backend-for-Frontend) pattern — proxy API via Route Handler `/api/v1/bff/*`
- Session management via httpOnly cookie + in-memory access token (Zustand)
- TanStack Query untuk server state
- shadcn/ui + Tailwind CSS v4 untuk UI

### 3. Admin Panel (`admin/`)
- Vite 8 + React 19 SPA
- Token management via localStorage
- Vite dev server proxy ke NestJS backend
- React Router v7 untuk routing
- TanStack Query untuk data fetching
- Path admin bersifat rahasia (di-env sebagai `VITE_ADMIN_LOGIN_PATH`)

## Fitur Utama

### Marketplace
- Katalog produk publik (tanpa login)
- CRUD produk (admin only)
- Manajemen stok dengan enkripsi konten
- Checkout dan pembuatan pesanan
- Upload bukti pembayaran (dikompresi server-side dengan sharp)
- Konfirmasi pembayaran oleh admin
- Auto-fulfillment pesanan saat stok tersedia
- Kategori produk
- Metode pembayaran (QRIS, Transfer Bank)

### Autentikasi
- Register dengan validasi password kompleks
- Login dengan JWT access token + refresh token
- **Login OAuth via Google dan GitHub** (auto-register kalau email belum terdaftar, link account kalau sudah ada)
- Login admin terpisah (`POST /auth/admin/login`) yang menolak role non-god
- Token refresh rotation + reuse detection (revoke all sessions)
- Profile update (nama, avatar)
- Admin: list semua users

### API Directory
- Katalog API services yang bisa di-browse publik (`/api-directory`)
- Detail per API: overview, endpoints, pricing plans, dokumentasi + code examples
- Subscribe ke plan (FREE otomatis, generate API key sekali tampil)
- Admin bisa aktif/nonaktifkan API — endpoint publiknya benar-benar ditutup (503), bukan hanya disembunyikan dari listing

### Market Data API (Public API)
- Data pasar real-time dari TradingView (forex, saham, crypto, komoditas)
- Endpoint: harga real-time, OHLC candles, market scanner, SSE stream
- Autentikasi via API key (`X-API-Key` header)
- Rate limiting + usage tracking per key

### Chat Realtime
- WebSocket dengan autentikasi one-time ticket
- User bisa memulai chat dengan admin
- Admin bisa melihat dan merespon semua percakapan
- Typing indicator
- Unread count
- Optimistic UI updates
- Pagination cursor-based

### Keamanan
- Password di-hash dengan Argon2id (OWASP recommended)
- Refresh token di-hash SHA256 (tidak pernah disimpan dalam bentuk raw)
- Konten stok dienkripsi AES-256-GCM
- Anti-IDOR pada endpoint orders, chat, dan storage
- Rate limiting (NestJS Throttler)
- Helmet security headers
- Validasi input (class-validator + whitelist)
- CORS terbatas
- Image validation (magic bytes, dimensi, rasio)
- Admin panel path rahasia + Vite middleware 403 blocker
