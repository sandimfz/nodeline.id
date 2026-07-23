# nodeline.id Frontend — Dokumentasi Proyek

**Stack:** Next.js 16.2.10 (App Router) + TanStack Query v5 + Zustand + shadcn/ui + Tailwind CSS v4  
**Backend:** NestJS di `http://localhost:3000/api/v1`  
**Package Manager:** Bun

---

## 1. Arsitektur

### 1.1 BFF (Backend-for-Frontend) Pattern

Semua request ke Nest API **tidak** dipanggil langsung dari browser. Next.js Route Handler (`app/api/[...path]/route.ts`) bertindak sebagai proxy:

```
Browser → /api/auth/login (Next.js BFF) → http://localhost:3000/api/v1/auth/login (Nest)
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Cookie management di sini:
          - nl_session (httpOnly): access token JWT
          - nl_refresh (httpOnly): refresh token opaque
```

**Keuntungan:**
- Access token tidak pernah terekspos ke JavaScript client (mitigasi XSS)
- Server Component bisa baca cookie `nl_session` untuk prefetch data
- Refresh token rotation + reuse detection tetap jalan di backend

### 1.2 Server-side Prefetch

Root layout (`app/layout.tsx`) melakukan prefetch data user di server:

```
1. SERVER: Baca nl_session cookie
2. SERVER: prefetchQuery /auth/me langsung ke Nest API pakai JWT
3. SERVER: dehydrate → HydrationBoundary → client
4. CLIENT: AuthInit cek cache → hydrate zustand store — NO EXTRA FETCH
```

### 1.3 Route Protection

`proxy.ts` (Next.js 16, ex-middleware) melindungi route:
- `/dashboard/*`, `/me/*`, `/orders/*`, `/checkout/*`, `/admin/*` → redirect ke `/auth/login` jika belum login
- `/auth/login`, `/auth/register` → redirect ke `/dashboard` jika sudah login

---

## 2. Struktur Folder Aktual

```
client/
├── app/                                    # Next.js App Router
│   ├── (app)/                              # Route group — butuh login
│   │   ├── chat/
│   │   │   ├── page.tsx                    # Server wrapper + prefetch + metadata
│   │   │   └── chat-client.tsx             # Chat UI (client component)
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # Server wrapper + metadata "Nodeline - Dashboard"
│   │   │   ├── dashboard-content.tsx       # Dashboard UI (client component)
│   │   │   └── profile/
│   │   │       ├── page.tsx                # Server wrapper + metadata "Nodeline - Profil"
│   │   │       └── profile-content.tsx     # Profile UI (client component)
│   │   ├── me/
│   │   │   └── page.tsx                    # Profil user
│   │   └── layout.tsx                      # AppShell wrapper
│   ├── (auth)/                             # Route group — halaman auth
│   │   └── layout.tsx
│   ├── api/
│   │   └── [...path]/
│   │       └── route.ts                    # BFF proxy ke Nest API
│   ├── auth/
│   │   ├── login/
│   │   │   ├── page.tsx                    # Server wrapper + metadata "Nodeline - Masuk"
│   │   │   └── login.tsx                   # Login UI (WebGL shader)
│   │   └── register/
│   │       ├── page.tsx                    # Server wrapper + metadata "Nodeline - Daftar"
│   │       └── register-content.tsx        # Register UI (client component)
│   ├── globals.css
│   ├── layout.tsx                          # Root layout (server prefetch)
│   ├── page.tsx                            # Landing page (public)
│   └── providers.tsx                       # QueryClientProvider + HydrationBoundary
│
├── components/
│   ├── auth/
│   │   └── auth-init.tsx                   # Session check on mount
│   ├── dashboard/                          # AppShell & dashboard components
│   │   ├── app-shell.tsx                   # Main dashboard layout
│   │   ├── app-header.tsx                  # Dashboard header (breadcrumbs, user menu)
│   │   ├── app-sidebar.tsx                 # Dashboard sidebar navigation
│   │   ├── app-breadcrumbs.tsx             # Breadcrumb navigation
│   │   ├── app-shared.tsx                  # Nav config (links, groups)
│   │   ├── custom-sidebar-trigger.tsx      # Sidebar toggle button
│   │   ├── logo.tsx                        # Logo component
│   │   ├── nav-group.tsx                   # Sidebar nav group
│   │   ├── nav-user.tsx                    # User avatar dropdown
│   │   └── latest-change.tsx               # Latest update indicator
│   ├── layout/                             # Public-facing components
│   │   ├── header.tsx                      # Navbar (auth-aware)
│   │   ├── footer.tsx
│   │   ├── hero.tsx                        # Landing page hero
│   │   ├── theme.tsx                       # Theme switcher
│   │   └── theme-provider.tsx              # next-themes provider
│   ├── motion/
│   │   └── animated-toast-stack.tsx        # Animated toast (shadcn block)│   ├── ui/                                 # shadcn/ui components (57 komponen)
│   └── chat/
│       ├── chat-window.tsx                 # Daftar pesan + auto-scroll
│       ├── chat-input.tsx                  # Input + send button
│       └── typing-indicator.tsx            # Animated typing dots
│   ├── features/                               # Domain layer
│   ├── auth/
│   │   ├── api.ts                          # loginUser, registerUser, getMe, etc.
│   │   ├── hooks.ts                        # useLogin, useRegister, useMe, useLogout
│   │   ├── schema.ts                       # Zod validation schemas
│   │   └── types.ts                        # TypeScript interfaces
│   └── chat/
│       ├── api.ts                          # REST: getOrCreateConversation, getMessages, dll
│       ├── hooks.ts                        # useChatSocket, useSendMessage, useUnreadCount, dll
│       ├── socket.ts                       # Socket.IO client (ticket auth + auto-reconnect)
│       └── types.ts                        # Conversation, Message interfaces
│
├── lib/
│   ├── api-client.ts                       # Fetch wrapper + auto-refresh on 401
│   ├── bff-server.ts                       # Server-side fetch helper (for prefetch)
│   ├── ease.ts                             # Easing functions (animated-toast)
│   ├── get-query-client.ts                 # Cached QueryClient per request
│   ├── query-keys.ts                       # TanStack Query key factory
│   ├── toast.tsx                           # Toast context provider
│   └── utils.ts                            # cn() utility
│
├── stores/
│   └── auth-store.ts                       # Zustand: accessToken + user (in-memory only)
│
├── hooks/
│   └── use-mobile.ts                       # Mobile detection hook
│
├── proxy.ts                                # Route guard (Next.js 16 proxy)
├── .env.local                              # API_BASE_URL, SESSION_COOKIE_NAME
└── components.json                         # shadcn/ui config
```

---

## 3. Tech Stack Detail

| Kategori | Pustaka | Versi |
|---|---|---|
| Framework | Next.js | 16.2.10 |
| State (server) | TanStack Query | 5.101.3 |
| State (client) | Zustand | 5.0.14 |
| Validasi | Zod | 3.25.76 |
| Form | react-hook-form | 7.82.0 |
| Icons | @tabler/icons-react | 3.45.0 |
| UI Library | shadcn/ui (base-ui) | - |
| Animation | motion | 12.42.2 |
| Toast | @beui/animated-toast-stack | - |
| CLI | Bun | - |

---

## 4. Master Checklist

###  Setup Proyek (SELESAI)
- [x] `create-next-app` (App Router, TypeScript, Tailwind)
- [x] Init shadcn/ui (`bunx shadcn@latest init`)
- [x] Install `@tanstack/react-query`, `@tanstack/react-query-devtools`
- [x] Install `zod`, `react-hook-form`, `@hookform/resolvers`
- [x] Install `zustand`
- [x] Setup `lib/api-client.ts` (BFF-aware, auto-refresh)
- [x] Setup `providers.tsx` (QueryClientProvider + HydrationBoundary)
- [x] Setup `lib/get-query-client.ts` (server-side prefetch)
- [x] Setup BFF Route Handler `app/api/[...path]/route.ts`
- [x] Setup `lib/query-keys.ts` factory

###  Fitur Auth (SELESAI)
- [x] Login page dengan validasi client-side
- [x] Register page dengan validasi password backend rules
- [x] BFF proxy untuk semua request auth
- [x] Auto-refresh token on 401 (mutex deduplication)
- [x] Server-side prefetch user data
- [x] Route guard via `proxy.ts`
- [x] Header auth-aware (guest vs logged-in)
- [x] Update profile (PATCH /auth/me) — hanya name, dual-layer validation
- [x] Profile page dengan createdAt + updatedAt
- [x] Inline error + toast feedback
- [x] Loading state on save button

### ✅ Fitur Avatar Upload (SELESAI)
- [x] Upload avatar via Cloudflare R2 (`POST /storage/upload`, purpose: `avatar`)
- [x] Server-side resize 400×400 WebP 80% via sharp
- [x] Auto-attach avatar URL ke user setelah upload
- [x] Hapus avatar (`DELETE /auth/me/avatar`)
- [x] Preview `AvatarImage` di profile page
- [x] `AvatarImage` di chat window (pesan sendiri)
- [x] `AvatarImage` di nav-user (sidebar dropdown)
- [x] `AvatarImage` di header
- [x] Loading state saat upload
- [x] Validasi client: format JPEG/PNG/WebP, max 2 MB
- [x] Validasi server: resize, max 2 MB

### ✅ Fitur Chat (SELESAI)
- [x] Realtime chat via Socket.IO (namespace `/chat`)
- [x] One-time ticket auth via BFF route `POST /api/chat/ticket`
- [x] TanStack Query hooks: `useConversation`, `useMessages` (infinite), `useSendMessage` (optimistic)
- [x] `useChatSocket` — subscribe `message:new`, append ke cache tanpa refetch
- [x] `useUnreadCount` — polling 15s, badge di sidebar
- [x] `useMarkAsRead` — REST endpoint, update unread count
- [x] Optimistic update + dedup (cegah double bubble)
- [x] Chat UI: `chat-window`, `chat-input`, `typing-indicator`
- [x] Halaman `/chat` dengan server prefetch
- [x] Unread badge di sidebar (realtime update via socket)

### ⬜ Fitur Marketplace (BELUM)
- [ ] Produk (catalog, detail)
- [ ] Orders (checkout, history)
- [ ] Payments
- [ ] Storage/upload

###  Metadata Title (SELESAI)
- [x] Root layout template: `"Nodeline - %s"`
- [x] Beranda → `"Nodeline - Beranda"`
- [x] Masuk → `"Nodeline - Masuk"`
- [x] Daftar → `"Nodeline - Daftar"`
- [x] Dashboard → `"Nodeline - Dashboard"`
- [x] Profil → `"Nodeline - Profil"`
- [x] Marketplace → `"Nodeline - Marketplace"`

### ⬜ Polish & Deploy
- [ ] Loading skeleton per halaman
- [ ] Error boundary global
