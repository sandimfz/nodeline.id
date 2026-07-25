# 05. Authentication & Authorization

## Arsitektur Auth

Nodeline.id menggunakan **JWT access token** + **opaque refresh token** untuk autentikasi. Ada dua mekanisme penyimpanan token berbeda untuk client dan admin:

### Client (Next.js) — httpOnly Cookie

```
Login/Register
     │
     ▼
NestJS → accessToken (response body) + refreshToken (httpOnly cookie)
     │                                      │
     ▼                                      ▼
Zustand store (in-memory)               Cookie diset oleh BFF
accessToken hanya di memory              refreshToken otomatis terkirim
(tidak persist ke localStorage)          di setiap request via cookie

Auto-refresh:
  401 response → POST /auth/refresh (cookie otomatis terkirim)
               → accessToken baru → retry original request
              Mutex: hanya 1 refresh call untuk N parallel 401
```

### Admin (Vite SPA) — localStorage

```
Login
  │
  ▼
NestJS → accessToken + refreshToken + user (response body)
  │
  ▼
localStorage (admin_token, admin_refresh, admin_user)
  │
  ▼
Axios interceptor → attach Bearer token di setiap request

Auto-refresh:
  401 response → Axios interceptor → POST /auth/refresh
               → accessToken baru disimpan → retry
              Mutex: queue N parallel 401 selama refresh
```

---

## Endpoint Auth

Semua endpoint auth berada di prefix `/api/v1/auth`.

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/auth/register` | Public | Register user baru (rate limit: 5/60s) |
| POST | `/auth/login` | Public | Login untuk semua role (rate limit: 5/60s) |
| POST | `/auth/admin/login` | Public | Login khusus admin — tolak non-god (rate limit: 5/60s) |
| GET | `/auth/oauth/google` | Public | Dapatkan Google consent URL |
| GET | `/auth/oauth/google/callback` | Public | Tukar code, find-or-create user, issue token |
| GET | `/auth/oauth/github` | Public | Dapatkan GitHub authorize URL |
| GET | `/auth/oauth/github/callback` | Public | Tukar code, find-or-create user, issue token |
| POST | `/auth/refresh` | Refresh Token | Refresh access token |
| POST | `/auth/logout` | JWT | Logout, revoke refresh token |
| GET | `/auth/me` | JWT | Get current user profile |
| PATCH | `/auth/me` | JWT | Update profile (name only) |
| DELETE | `/auth/me/avatar` | JWT | Remove avatar |
| GET | `/auth/admin/users` | JWT + God | List all users |

---

## OAuth (Google & GitHub)

### Alur

```
1. Client GET /auth/oauth/{provider}  → { url }
2. Browser redirect ke url (consent screen provider)
3. Provider redirect ke {OAUTH_REDIRECT_BASE}/auth/callback/{provider}?code=...
4. Callback page (client) kirim code ke GET /auth/oauth/{provider}/callback via BFF
5. Server tukar code → access token provider → ambil profil user
6. Server find-or-create user, issue JWT + refresh token
7. BFF set session cookie, client simpan accessToken di Zustand
```

### Find-or-Create

```
Cari user by (oauth_provider, oauth_id)
  ├── Ketemu → pakai user itu, update avatar kalau berubah
  └── Tidak ketemu → cari by email
        ├── Ketemu → LINK: set oauth_provider + oauth_id ke user existing,
        │            set is_email_verified = true
        └── Tidak ketemu → CREATE user baru:
                           password_hash = NULL
                           is_email_verified = true
                           role = 'user'
```

**Catatan:** User yang login OAuth dengan email belum terdaftar **otomatis terdaftar**. Tidak perlu register manual dulu.

Setelah account di-link, user bisa login lewat OAuth maupun email+password (kalau sebelumnya punya password).

### Env yang dibutuhkan

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=https://app.sandimf.dev
```

Redirect URI yang harus didaftarkan di provider:
- Google: `{OAUTH_REDIRECT_BASE}/auth/callback/google`
- GitHub: `{OAUTH_REDIRECT_BASE}/auth/callback/github`

### Catatan implementasi

- Email GitHub bisa privat — kalau `user.email` null, server fetch `/user/emails` dan ambil yang primary + verified. Kalau tetap tidak ada, request ditolak.
- `password_hash` sekarang nullable. Login password menolak user yang password_hash-nya NULL (user OAuth-only).
- BFF **wajib** meneruskan query string (`?code=...`) ke backend. Ini pernah jadi bug: BFF hanya meneruskan pathname sehingga backend selalu menjawab "Missing authorization code".

---

## Login Admin

Admin panel memakai endpoint terpisah `POST /auth/admin/login` yang memvalidasi `role === 'god'` di server. User biasa yang mencoba login di admin panel dapat 401 "Akses ditolak" dan tidak pernah menerima token.

Frontend admin juga mengecek role di `onSuccess` sebagai lapisan kedua (defense-in-depth), tapi penegakan utamanya di server.

---

## Token Management

### Access Token (JWT)

- Format: JWT signed dengan `JWT_ACCESS_SECRET`
- Payload: `{ sub, email, role, jti }`
- Expiry: 15 menit (configurable via `JWT_ACCESS_EXPIRES_IN`)
- Dikirim via `Authorization: Bearer <token>` header
- Client: disimpan di in-memory Zustand store (tidak persist)
- Admin: disimpan di localStorage

### Refresh Token

- Format: Opaque token `nl_rt_{48 bytes base64url}`
- Hanya SHA256 hash yang disimpan di database
- Expiry: 30 hari (configurable via `JWT_REFRESH_EXPIRES_IN`)
- Client: httpOnly cookie (path: `/api/v1/auth`, secure, sameSite)
- Admin: localStorage
- **Rotation:** Setiap refresh, token lama di-revoke dan token baru diterbitkan
- **Reuse Detection:** Jika token yang sudah di-revoke dipakai lagi, semua sesi user di-revoke

### Refresh Token Table

```sql
refresh_tokens {
  id: uuid (PK)
  user_id: uuid (FK → users)
  token_hash: varchar(255) UNIQUE  -- SHA256 hash
  replaced_by_token_hash: varchar(255)  -- token baru saat rotasi
  is_revoked: boolean
  expires_at: timestamp
  created_at: timestamp
}
```

---

## Role & Otorisasi

### Role

| Role | Level | Akses |
|------|-------|-------|
| `user` | 0 | Melihat katalog, checkout, chat, profile sendiri |
| `god` | 1 | Semua akses admin (CRUD produk, konfirmasi payment, chat, users) |

### Guard Chain

```
Request → JwtAuthGuard (autentikasi) → RolesGuard (otorisasi)
              │                               │
              ▼                               ▼
       Extract JWT dari header           Cek role di payload
       Validasi signature + expiry       Cocokkan dengan @Roles()
       Attach user ke request            ForbiddenException jika mismatch
```

### Decorators

```typescript
// Controller-level: endpoint ini hanya untuk god
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('god')
@Controller('products/admin')

// Mendapatkan current user di handler
@CurrentUser() user: { id: string; role: string }
```

### Contoh Penggunaan

```typescript
// Public endpoint — tanpa auth
@Get('products')
findCatalog() { ... }

// Authenticated endpoint — user mana pun
@UseGuards(JwtAuthGuard)
@Get('orders')
findMine(@CurrentUser() user) { ... }

// Admin-only endpoint
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('god')
@Post('products/admin')
create(@CurrentUser() user, @Body() dto) { ... }

// Admin-only dengan nested guard (publik di root, admin di sub-path)
@Controller()
class CategoriesController {
  @Get('categories')         // Public
  findAll() { ... }

  @Post('categories/admin')  // God only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  create(@Body() dto) { ... }
}
```

---

## Alur Register

```
1. Client kirim { email, password, name }
2. Server validasi:
   - Email unique (ConflictException jika sudah terdaftar)
   - Password: min 8 chars, harus ada huruf besar, huruf kecil, angka
   - Nama: 2-50 karakter
3. Hash password dengan Argon2id (memoryCost=19456, timeCost=2)
4. Insert user ke database
5. Generate access token + refresh token
6. Set refresh token httpOnly cookie
7. Return { user, accessToken }
```

## Alur Login

```
1. Client kirim { email, password }
2. Server cari user by email
3. Verifikasi password dengan Argon2
4. Generic error (tidak reveal apakah email ada): "Email atau password salah"
5. Generate tokens + set cookie
6. Return { user, accessToken }
```

## Alur Refresh Token

```
1. Client POST /auth/refresh (cookie/body refreshToken otomatis terkirim)
2. JwtRefreshGuard extract raw refresh token → attach ke req.user
3. AuthService:
   a. Hash raw token dengan SHA256
   b. Cari di tabel refresh_tokens
   c. Jika token revoked → REUSE DETECTED: revoke semua sesi user
   d. Jika expired → UnauthorizedException
   e. Rotasi: revoke token lama, issue token baru
   f. Return { accessToken, refreshToken }
```

---

## Keamanan

| Aspek | Implementasi |
|-------|-------------|
| Password storage | Argon2id (not bcrypt — recommended by OWASP) |
| Refresh token storage | SHA256 hash (raw token never stored) |
| Reuse detection | Revoke all sessions on rotated token reuse |
| JTI (JWT ID) | Random 12-byte hex di setiap access token |
| CORS | Terbatas ke origin yang terdaftar di env |
| Rate limit auth | 5 request/60 detik untuk login & register |
| Auto-cleanup | Expired refresh tokens dihapus saat revoke |
| Mass assignment protection | Whitelist fields + ValidationPipe forbidNonWhitelisted |
| Profile update | Hanya field `name` yang diizinkan (checked di client + server) |
| Admin path | Secret path di-env + Vite middleware 403 blocker |
