# Auth API

**Prefix:** `/api/v1/auth`

---

## POST /auth/register

Mendaftarkan user baru.

**Rate Limit:** 5 requests / 60 detik

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "accessToken": "eyJhbGci..."
}
```

**Set Cookie:** `nl_refresh` (httpOnly, path=/api/v1/auth)

**Error (409):** `"Email sudah terdaftar"`
**Error (400):** Validasi gagal (password terlalu lemah, dll.)

---

## POST /auth/login

Login dengan email dan password.

**Rate Limit:** 5 requests / 60 detik

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "avatarUrl": null
  },
  "accessToken": "eyJhbGci..."
}
```

**Set Cookie:** `nl_refresh` (httpOnly, path=/api/v1/auth)

**Error (401):** `"Email atau password salah"`

---

## POST /auth/refresh

Refresh access token menggunakan cookie refresh token.

**Rate Limit:** 10 requests / 60 detik

**Auth:** Refresh cookie atau `refreshToken` di body

**Request (body alternatif untuk admin):**
```json
{
  "refreshToken": "nl_rt_..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGci..."
}
```

**Set Cookie:** Refresh token baru (rotated)

**Error (401):** Refresh token invalid / expired / reuse detected
**Error (401):** `"Token reuse detected, semua sesi di-logout"` (jika reuse terdeteksi)

---

## POST /auth/logout

Logout dan revoke refresh token.

**Auth:** JWT Access Token

**Response (200):**
```json
{
  "message": "Logged out"
}
```

**Clear Cookie:** `nl_refresh`

---

## GET /auth/me

Mendapatkan profil user saat ini.

**Auth:** JWT Access Token

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "isEmailVerified": false,
  "avatarUrl": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## PATCH /auth/me

Update profil user (saat ini hanya `name`).

**Auth:** JWT Access Token

**Request:**
```json
{
  "name": "Nama Baru"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Nama Baru",
  "role": "user",
  "isEmailVerified": false,
  "avatarUrl": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error (400):** Field tidak dikenal akan di-reject (forbidNonWhitelisted).

---

## DELETE /auth/me/avatar

Hapus avatar user.

**Auth:** JWT Access Token

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "isEmailVerified": false,
  "avatarUrl": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## GET /auth/admin/users

Mendapatkan daftar semua users (admin/god only).

**Auth:** JWT Access Token + Role `god`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isEmailVerified": false,
    "avatarUrl": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Error (403):** `"Anda tidak memiliki akses untuk resource ini"` (jika bukan god)
