# 11. Deployment

## Build

### API Backend

```bash
cd api

# Build production
pnpm build
# Output: dist/

# Run production
pnpm start:prod
# Atau: node dist/main
```

**Environment Variables Production:**
```env
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://nodeline.id,https://admin.nodeline.id
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
```

### Client Frontend

```bash
cd client

# Build production
bun run build
# Output: .next/

# Run production
bun run start
```

### Admin Panel

```bash
cd admin

# Build production
bun run build
# Output: dist/
```

Build output (`admin/dist/`) bisa di-serve sebagai static file atau di-deploy ke CDN.

---

## Deployment Options

### Opsi 1: VPS / Dedicated Server

**Prerequisites:**
- Node.js 20+
- PostgreSQL 16+
- PM2 (process manager) atau systemd
- Nginx/Caddy sebagai reverse proxy

**Struktur:**
```
/var/www/nodeline.id/
├── api/        # NestJS production build
├── client/     # Next.js production build
└── admin/      # Vite static build
```

**Nginx Config (contoh):**
```nginx
# API Backend
server {
    listen 443 ssl;
    server_name api.nodeline.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Client Frontend
server {
    listen 443 ssl;
    server_name nodeline.id www.nodeline.id;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Panel
server {
    listen 443 ssl;
    server_name admin.nodeline.id;

    root /var/www/nodeline.id/admin/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Opsi 2: Docker (belum ada Dockerfile)

> **Catatan:** Project ini belum memiliki Dockerfile atau docker-compose.yml. Perlu dibuat untuk deployment containerized.

### Opsi 3: Platform-as-a-Service

**API + Client:** Railway, Fly.io, atau Render
**Admin:** Vercel, Netlify, atau Cloudflare Pages
**Database:** Neon, Supabase, atau Railway Postgres
**Storage:** Cloudflare R2 (sudah terintegrasi)

---

## Environment Variables Production

### API (`/api/.env`)

| Variable | Contoh Value | Catatan |
|----------|-------------|---------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `CORS_ORIGINS` | `https://nodeline.id,https://admin.nodeline.id` | |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/nodeline` | Gunakan connection pooling (PgBouncer) jika perlu |
| `JWT_ACCESS_SECRET` | Random 32+ chars | Jangan pernah commit |
| `JWT_REFRESH_SECRET` | Random 32+ chars | Jangan pernah commit |
| `REFRESH_COOKIE_NAME` | `nl_refresh` | |
| `COOKIE_SECURE` | `true` | Wajib untuk HTTPS |
| `COOKIE_SAMESITE` | `strict` | |
| `STOCK_ENCRYPTION_KEY` | 64 hex chars | Generate: `openssl rand -hex 32` |
| `R2_ACCESS_KEY_ID` | dari Cloudflare | |
| `R2_SECRET_ACCESS_KEY` | dari Cloudflare | |
| `R2_BUCKET_NAME` | `nodeline-images` | |
| `R2_ACCOUNT_ID` | dari Cloudflare | |
| `R2_PUBLIC_URL` | `https://cdn.nodeline.id` | Custom domain atau R2.dev URL |
| `R2_UPLOAD_EXPIRES_IN` | `600` | 10 menit |

### Client (`/client/.env.local`)

| Variable | Contoh Value | Catatan |
|----------|-------------|---------|
| `API_BASE_URL` | `https://api.nodeline.id/api/v1` | Backend URL untuk SSR |
| `SESSION_COOKIE_NAME` | `nl_session` | Harus sama dengan cookie name di BFF |
| `NEXT_PUBLIC_WS_URL` | `wss://api.nodeline.id` | WebSocket URL |

### Admin (`/admin/.env`)

| Variable | Contoh Value | Catatan |
|----------|-------------|---------|
| `VITE_ADMIN_LOGIN_PATH` | Random string | Secret path untuk admin |
| `API_TARGET` | `https://api.nodeline.id` | Backend URL untuk Vite proxy |

---

## Database Migrations

```bash
# Generate migration
cd api
pnpm db:generate

# Apply migration
pnpm db:push

# Seed god user (pertama kali)
pnpm seed:god
```

> **Catatan:** Untuk production, sebaiknya migration dijalankan sebagai bagian dari deployment pipeline (bukan manual).

---

## Checklist Deployment

- [ ] Generate `STOCK_ENCRYPTION_KEY` (`openssl rand -hex 32`)
- [ ] Generate `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET`
- [ ] Generate `VITE_ADMIN_LOGIN_PATH` (random string)
- [ ] Setup PostgreSQL database + connection string
- [ ] Setup Cloudflare R2 + generate API key
- [ ] Setup custom domain untuk R2 (opsional)
- [ ] Setup HTTPS certificates
- [ ] Setup reverse proxy (Nginx/Caddy)
- [ ] Jalankan migrasi database
- [ ] Seed user god
- [ ] Build semua aplikasi
- [ ] Start API backend
- [ ] Start Client frontend
- [ ] Deploy admin static build
- [ ] Test semua endpoint
- [ ] Setup monitoring & logging
