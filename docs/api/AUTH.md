# nodeline.id API — Auth Reference

> Base URL: `http://localhost:3000/api/v1` (dev)  
> Semua endpoint auth di bawah path `/api/v1/auth`.

---

## Autentikasi

Dua jenis kredensial:

| Tipe | Mekanisme | Masa berlaku | Disimpan klien |
|---|---|---|---|
| **Access token** | JWT, header `Authorization: Bearer <jwt>` | pendek (default `15m`) | memori / localStorage klien (disarankan memori) |
| **Refresh token** | opaque string `nl_rt_...`, **httpOnly cookie** | panjang (default `30d`), di-rotate tiap dipakai | cookie `nl_refresh` (httpOnly, sameSite=strict) |

Access token dikirim di header setiap request ke endpoint protected. Refresh token otomatis ikut karena cookie httpOnly (pastikan klien mengirim `credentials: 'include'` / cookie jar).

> Refresh token **tidak boleh** disimpan di localStorage. Cookie httpOnly melindunginya dari pencurian via XSS.

---

## Endpoints

### 1. Register

`POST /api/v1/auth/register`

Daftarkan user baru. Role default `user`. Setelah sukses, access token + refresh token (cookie) diterbitkan.

**Rate limit:** 5 request / menit / IP.

**Request body**

```json
{
  "email": "alice@nodeline.test",
  "password": "Password123",
  "name": "Alice"
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `email` | string | format email valid |
| `password` | string | 8–64 karakter, wajib mengandung huruf besar, huruf kecil, dan angka |
| `name` | string | 2–50 karakter |

**Response `201 Created`**

```json
{
  "user": {
    "id": "dfef9fc6-5501-46d1-a87e-167a98cae2ce",
    "email": "alice@nodeline.test",
    "name": "Alice",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Plus header `Set-Cookie: nl_refresh=nl_rt_...; HttpOnly; Path=/api/v1/auth; SameSite=Strict` (dan `Secure` saat `COOKIE_SECURE=true`).

**Errors**

| Status | Penyebab |
|---|---|
| `400` | Body tidak valid (field hilang / password lemah / field asing ditolak) |
| `409` | Email sudah terdaftar |
| `429` | Rate limit terlampaui |

**Contoh (curl)**

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@nodeline.test","password":"Password123","name":"Alice"}'
```

---

### 2. Login

`POST /api/v1/auth/login`

Login dengan email + password. Pesan error generik — tidak membocorkan apakah email terdaftar.

**Rate limit:** 5 request / menit / IP.

**Request body**

```json
{
  "email": "alice@nodeline.test",
  "password": "Password123"
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `email` | string | format email valid |
| `password` | string | string (kompleksitas tidak divalidasi di login) |

**Response `200 OK`** — sama dengan register: `{ user, accessToken }` + cookie refresh.

**Errors**

| Status | Penyebab |
|---|---|
| `400` | Body tidak valid |
| `401` | Email atau password salah (pesan generik, berlaku untuk email tidak ada / password salah) |
| `429` | Rate limit terlampaui |

**Contoh**

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@nodeline.test","password":"Password123"}'
```

---

### 3. Refresh

`POST /api/v1/auth/refresh`

Rotasi refresh token: kembalikan access token baru + refresh token baru (cookie di-rotate). Token lama langsung di-revoke.

**Rate limit:** 10 request / menit / IP.

**Request**: tidak perlu body. Refresh token dibaca otomatis dari cookie `nl_refresh`. Untuk klien non-browser, kirim via body:

```json
{ "refreshToken": "nl_rt_..." }
```

**Response `200 OK`**

```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

Plus `Set-Cookie` dengan refresh token baru (rotasi).

**Reuse detection (keamanan penting)**

Jika refresh token yang **sudah di-rotate** dipakai lagi, sistem menganggap token dicuri dan **mencabut SEMUA sesi user tersebut**. Setelah itu, token baru yang sebelumnya valid juga menjadi tidak valid.

**Errors**

| Status | Penyebab |
|---|---|
| `401` | Refresh token tidak ditemukan / tidak dikenal / kedaluwarsa / reuse terdeteksi (semua sesi di-logout) |
| `429` | Rate limit terlampaui |

**Contoh (browser — cookie otomatis)**

```bash
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/auth/refresh
```

---

### 4. Logout

`POST /api/v1/auth/logout`

Revoke refresh token yang aktif dan hapus cookie. Butuh access token valid.

**Auth:** `Authorization: Bearer <accessToken>`.

**Request body**: kosong. Refresh token dibaca dari cookie.

**Response `200 OK`**

```json
{ "message": "Logged out" }
```

Cookie `nl_refresh` di-clear.

**Errors**

| Status | Penyebab |
|---|---|
| `401` | Access token hilang / tidak valid / kedaluwarsa |

**Contoh**

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

---

### 5. Me

`GET /api/v1/auth/me`

Info user yang sedang login (berdasarkan access token).

**Auth:** `Authorization: Bearer <accessToken>`.

**Response `200 OK`**

```json
{
  "id": "dfef9fc6-5501-46d1-a87e-167a98cae2ce",
  "email": "alice@nodeline.test",
  "name": "Alice",
  "role": "user",
  "isEmailVerified": false,
  "createdAt": "2026-07-20T16:25:35.316Z"
}
```

> Field `passwordHash` tidak pernah dikembalikan di response mana pun.

**Errors**

| Status | Penyebab |
|---|---|
| `401` | Access token hilang / tidak valid / kedaluwarsa |

**Contoh**

```bash
curl -i http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

---

## Health (non-auth)

`GET /api/v1/health` — tidak butuh auth, untuk load balancer.

```json
{ "status": "ok", "timestamp": "2026-07-20T09:25:35.025Z" }
```

---

## Alur Lengkap (happy path)

```
1. POST /auth/register      → 201 { user, accessToken } + Set-Cookie: nl_refresh
2. GET  /auth/me           → 200 { id, email, name, role, ... }   (pakai accessToken)
3. POST /auth/refresh      → 200 { accessToken } + Set-Cookie: nl_refresh (rotasi)
4. POST /auth/logout       → 200 { message } + clear cookie        (pakai accessToken)
5. POST /auth/refresh (token lama) → 401  (reuse → semua sesi dicabut)
```

## Alur reuse detection

```
A. POST /auth/register        → refreshToken R1 (cookie)
B. POST /auth/refresh (R1)    → 200 + refreshToken R2 (R1 di-revoke)
C. POST /auth/refresh (R1)    → 401  ← R1 sudah di-rotate = REUSE
   ⇒ semua sesi user di-revoke
D. POST /auth/refresh (R2)    → 401  ← R2 juga mati (semua sesi dicabut di langkah C)
```

## Error response format

Semua error memakai format standar NestJS:

```json
{
  "statusCode": 401,
  "message": "Email atau password salah",
  "error": "Unauthorized"
}
```

Validation error (`400`) bisa berisi array `message`:

```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

### 6. Update Profile

`PATCH /api/v1/auth/me`

Update profil user yang sedang login. **Hanya field `name` yang diizinkan.**

**Auth:** `Authorization: Bearer <accessToken>`.

**Rate limit:** default 100 request / menit / IP.

**Request body**

```json
{
  "name": "Nama Baru"
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `name` | string | 2–50 karakter, wajib diisi |

> Field lain (`email`, `role`, `isEmailVerified`, dll) akan ditolak oleh global `ValidationPipe` dengan `forbidNonWhitelisted: true`. Error: `["property email should not exist"]`.

**Response `200 OK`**

```json
{
  "id": "dfef9fc6-5501-46d1-a87e-167a98cae2ce",
  "email": "alice@nodeline.test",
  "name": "Nama Baru",
  "role": "user",
  "isEmailVerified": false,
  "createdAt": "2026-07-20T16:25:35.316Z",
  "updatedAt": "2026-07-21T16:25:35.316Z"
}
```

**Errors**

| Status | Penyebab |
|---|---|
| `400` | Name kosong / terlalu pendek / terlalu panjang / ada field asing |
| `401` | Access token hilang / tidak valid / kedaluwarsa |

**Contoh**

```bash
curl -X PATCH http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nama Baru"}'
```

---

## Belum diimplementasi (ditunda)

- `POST /auth/forgot-password` — butuh transport email
- `POST /auth/reset-password` — bagian dari flow forgot-password
- Email verification
- Penegasan RBAC via `@Roles(...)` (scaffold `RolesGuard` sudah ada, policy ditunda)

Lihat status lengkap di `docs/1.Auth.md` bagian "Implementasi Aktual".
