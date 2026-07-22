# Nodeline Admin Panel — Dokumentasi Proyek

**Stack:** Vite 8 + React 19 + TypeScript + Zustand + TanStack Query v5 + shadcn/ui + Tailwind CSS v4  
**Backend:** NestJS di `http://localhost:3000/api/v1`  
**Package Manager:** Bun

---

## 1. Arsitektur

### 1.1 BFF via Vite Proxy

Berbeda dengan frontend user (Next.js BFF dengan httpOnly cookies), admin panel menggunakan pola yang lebih sederhana:

```
Browser Admin → /api/auth/login (Vite Proxy) → http://localhost:3000/api/v1/auth/login (Nest)
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                 Vite dev server proxy di vite.config.ts
```

**Perbedaan dengan client (frontend user):**

| Aspek | Client (Next.js) | Admin (Vite) |
|---|---|---|
| **Token storage** | httpOnly cookie (BFF) | localStorage |
| **Refresh** | Otomatis via BFF + cookie | Manual via interceptor |
| **BFF** | Next.js Route Handler | Vite proxy (sederhana) |
| **Prefetch** | Server-side (RSC) | TanStack Query staleTime |
| **Routing** | App Router (file-based) | react-router-dom |

### 1.2 Auth Flow

```
1. Admin buka /login
2. Input email + password → POST /api/auth/login
3. Nest return { accessToken, refreshToken, user }
4. Simpan accessToken + refreshToken di localStorage
5. Redirect ke /dashboard
6. Setiap request: attach Authorization: Bearer <token>
7. Kalau 401: coba refresh → kalau gagal → redirect /login
```

### 1.3 Route Protection

Komponen `<ProtectedRoute>` di `routes.tsx`:
- Cek localStorage untuk accessToken
- Kalau tidak ada → redirect ke `/login`
- Kalau ada → render halaman

---

## 2. Struktur Folder

```
admin/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/                          # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── app-shell.tsx            # Dashboard layout (sidebar + header)
│   │   │   ├── app-sidebar.tsx          # Sidebar navigation
│   │   │   ├── app-header.tsx           # Header with user menu
│   │   │   └── theme.tsx                # Theme toggle
│   │   ├── auth/
│   │   │   └── auth-init.tsx            # Session check on mount
│   │   └── ...
│   ├── features/
│   │   └── auth/
│   │       ├── types.ts                 # TypeScript interfaces
│   │       ├── schema.ts                # Zod validation
│   │       ├── api.ts                   # API functions
│   │       └── hooks.ts                 # TanStack Query hooks
│   ├── stores/
│   │   └── auth-store.ts                # Zustand: token + user (persisted)
│   ├── lib/
│   │   ├── utils.ts                     # cn() utility
│   │   ├── query-keys.ts                # Query key factory
│   │   └── api-client.ts                # Axios instance with interceptor
│   ├── hooks/
│   │   └── use-mobile.ts
│   ├── features/
│   │   └── chat/
│   │       ├── types.ts                 # Conversation, Message interfaces
│   │       ├── api.ts                   # REST: getConversations, getMessages, dll
│   │       └── hooks.ts                 # useConversations, useMessages, useCloseConversation
│   ├── pages/
│   │   ├── LoginPage.tsx                # Login page
│   │   ├── DashboardPage.tsx            # Dashboard home
│   │   ├── ChatConversationsPage.tsx    # Daftar percakapan (aktif/ditutup)
│   │   ├── ChatConversationDetailPage.tsx # Detail percakapan + balas pesan
│   │   └── ...
│   ├── App.tsx                          # Router setup
│   ├── main.tsx                         # Entry point
│   └── index.css                        # Tailwind + shadcn/ui styles
├── docs/
│   ├── ADMIN.md                         # Dokumentasi ini
│   └── 1.Auth.md                        # Auth implementation detail
├── .env                                 # API_BASE_URL
├── vite.config.ts                       # Vite config + proxy
├── tsconfig.json
└── package.json
```

---

## 3. Tech Stack

| Kategori | Pustaka | Versi |
|---|---|---|
| Framework | React + Vite | 19 + 8 |
| Routing | react-router-dom | ^7 |
| State (server) | TanStack Query | v5 |
| State (client) | Zustand | v5 |
| Validasi | Zod | ^4 |
| HTTP | axios | ^1 |
| Icons | lucide-react | ^1.25 |
| UI Library | shadcn/ui (base-ui) | - |
| CSS | Tailwind CSS | v4 |
| CLI | Bun | - |

---

## 4. Environment Variables

Buat file `.env` di root admin:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Vite proxy di `vite.config.ts` otomatis forward `/api/*` ke `http://localhost:3000`.

---

## 5. Scripts

```bash
bun dev          # Start dev server (port 5173)
bun run build    # Build for production
bun run preview  # Preview production build
bun run typecheck  # TypeScript check
```
