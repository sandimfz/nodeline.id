# Login dengan Google & GitHub (OAuth) — Checklist

> **Status:** Implementasi selesai, menggunakan pendekatan yang lebih sederhana dari Opsi A/B di bawah. Alur final: client call BFF → BFF call Nest → Nest return OAuth URL + set `state` cookie → redirect ke provider → callback page kirim code+state via BFF → Nest validasi state, tukar code, issue tokens. Lihat [05-auth.md](./05-auth.md) untuk dokumentasi final.
>
> **Update keamanan (2026-07-26):** OAuth state parameter (CSRF protection) sudah ditambahkan. State di-sign dengan HMAC-SHA256, disimpan di httpOnly cookie, divalidasi di callback.

Nyambung ke sistem auth existing: access token (JWT, short-lived) + refresh token (httpOnly cookie, di-rotate). Tujuannya: hasil akhir OAuth login harus terasa **identik** dengan hasil `POST /auth/login` biasa dari sisi frontend — bukan mekanisme session terpisah.

---

## 1. Keputusan Arsitektur — Masalah Utama

OAuth itu **redirect-based** (browser navigasi penuh, bukan `fetch()`), sedangkan pola BFF yang sudah dipakai project ini (lihat dokumen struktur & fitur profile) mengasumsikan Next.js yang memanggil Nest lewat `fetch()` server-to-server supaya cookie `nl_access`/`nl_refresh` bisa di-set di domain Next. Redirect OAuth **tidak bisa** lewat proxy fetch biasa — provider (Google/GitHub) harus redirect balik ke URL yang benar-benar bisa browser navigasi.

Ini masalah yang sama persis dengan yang kita pecahkan di fitur **realtime chat** pakai pola *ticket exchange*. Solusinya sama: jangan biarkan Nest men-set cookie sesi langsung di domainnya sendiri — Nest cukup terbitkan **kode sekali-pakai**, lalu Next yang menukarnya jadi cookie sungguhan.

### Alur (Opsi A — Ticket/Code Exchange, direkomendasikan)

```
1. Browser klik "Login with Google"
   → GET https://api.nodeline.id/api/v1/auth/google        (navigasi langsung ke Nest, bukan lewat Next)

2. Nest redirect ke Google OAuth consent screen
   (state param di-generate & disimpan, lihat §5)

3. User approve di Google → Google redirect balik ke:
   GET https://api.nodeline.id/api/v1/auth/google/callback?code=...&state=...

4. Nest:
   - Tukar `code` → profil user dari Google (Passport strategy handle ini)
   - Cari/buat user + oauth_accounts (lihat §2)
   - Generate accessToken + refreshToken SEPERTI biasa, TAPI jangan di-set sebagai cookie di domain Nest
   - Simpan hasil login sementara di cache (Redis), key = "login ticket" acak, umur pendek (±60 detik), sekali pakai
   - Redirect browser ke:
     https://app.nodeline.id/auth/callback?ticket=xxxxx

5. Next.js — halaman/Route Handler /auth/callback:
   - Server-side, tukar ticket → POST https://api.nodeline.id/api/v1/auth/oauth/exchange { ticket }
   - Nest validasi ticket (cocok & belum dipakai & belum expired), hapus dari cache, balikin { user, accessToken } + Set-Cookie refresh (sama seperti alur login/register biasa)
   - Next set cookie nl_access httpOnly (sama seperti login manual)
   - Redirect user ke halaman utama app, sudah login
```

Kenapa lewat ticket, bukan langsung taruh `accessToken`/`refreshToken` di query string redirect step 4 → 5? Karena URL gampang ke-log (browser history, server access log, proxy log, Referer header ke pihak ketiga) — kode sekali-pakai umur pendek jauh lebih aman daripada token asli nangkring di URL.

### Alur (Opsi B — Shared cookie domain, lebih simpel tapi trade-off sama seperti sebelumnya)
Kalau Next dan Nest satu root domain (`app.nodeline.id` & `api.nodeline.id` di bawah `.nodeline.id`), Nest boleh langsung set cookie `nl_refresh`/`nl_access` dengan `Domain=.nodeline.id` di callback lalu redirect ke `app.nodeline.id`. Lebih sedikit moving parts, tapi Nest jadi ikut pegang cookie sesi secara langsung (sama trade-off yang sudah dibahas di fitur chat).

> Checklist di bawah pakai **Opsi A** sebagai default.

---

## 2. Data Model

Jangan simpan data OAuth langsung di tabel `users` — pisah ke tabel relasi, supaya 1 user bisa punya beberapa provider terhubung (Google **dan** GitHub sekaligus), dan supaya password tetap opsional.

```
users {
  ...kolom existing...
  passwordHash   varchar?   -- jadi NULLABLE: user OAuth-only tidak punya password
}

oauth_accounts {
  id                 uuid   PK
  userId             uuid   FK -> users.id
  provider           enum   'google' | 'github'
  providerAccountId  varchar   -- id unik dari provider (bukan email!)
  email              varchar   -- email yang dikembalikan provider saat itu
  emailVerified      boolean   -- penting, lihat §6
  createdAt          timestamp
  UNIQUE (provider, providerAccountId)
}
```

- [ ] `passwordHash` di tabel `users` diubah jadi nullable (migration) — user yang daftar via OAuth murni tidak punya password sampai mereka set password manual nanti (opsional fitur "set password" di halaman profile)
- [ ] `providerAccountId` (ID internal dari Google/GitHub) yang jadi identitas utama, **bukan email** — email bisa berubah/dipakai ulang, ID provider tidak
- [ ] Constraint unique `(provider, providerAccountId)` — 1 akun Google cuma bisa nempel ke 1 user

---

## 3. Backend Checklist (NestJS)

- [ ] Install `passport-google-oauth20`, `passport-github2` (+ `@types/...`)
- [ ] `GoogleStrategy extends PassportStrategy(Strategy, 'google')` — scope minimal: `['profile', 'email']`
- [ ] `GithubStrategy extends PassportStrategy(Strategy, 'github')` — scope minimal: `['user:email']` (email GitHub sering `null` di profil utama kalau tidak minta scope ini eksplisit, lihat §6)
- [ ] `AuthController`:
  - [ ] `GET /auth/google` — `@UseGuards(AuthGuard('google'))`, trigger redirect ke Google
  - [ ] `GET /auth/google/callback` — `@UseGuards(AuthGuard('google'))`, handle hasil, generate ticket, redirect ke frontend
  - [ ] `GET /auth/github` / `GET /auth/github/callback` — sama pola
  - [ ] `POST /auth/oauth/exchange` — tukar ticket → `{ user, accessToken }` + `Set-Cookie` refresh (dipanggil Next, server-to-server, **bukan** dari browser)
- [ ] `OAuthService.findOrCreateUser(provider, profile)`:
  - [ ] Cari `oauth_accounts` by `(provider, providerAccountId)` → kalau ada, user sudah pernah login, langsung pakai
  - [ ] Kalau belum ada, cek `users.email === profile.email` (akun lama dari register manual) → lihat aturan linking di §6, **jangan auto-link tanpa validasi**
  - [ ] Kalau user benar-benar baru → buat `users` row (tanpa password) + `oauth_accounts` row
- [ ] Ticket store: Redis (atau tabel DB sementara), TTL pendek (≤60 detik), **hapus setelah sekali dipakai** (pola sama seperti `ws-ticket` di fitur chat)
- [ ] Response `POST /auth/oauth/exchange` format **identik** dengan `POST /auth/login` yang sudah ada (`{ user, accessToken }` + cookie refresh) — supaya frontend tidak perlu logic beda

---

## 4. Endpoint Ringkas

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/v1/auth/google` | - | Mulai OAuth flow Google |
| GET | `/api/v1/auth/google/callback` | - | Callback dari Google, redirect ke frontend dengan ticket |
| GET | `/api/v1/auth/github` | - | Mulai OAuth flow GitHub |
| GET | `/api/v1/auth/github/callback` | - | Callback dari GitHub, redirect ke frontend dengan ticket |
| POST | `/api/v1/auth/oauth/exchange` | - (ticket sekali pakai) | Tukar ticket → session (dipanggil Next BFF) |

**Rate limit:** samakan dengan endpoint auth existing (mis. 5-10/menit/IP) — endpoint callback & exchange termasuk yang perlu dilindungi juga, bukan cuma login/register manual.

---

## 5. Keamanan — CSRF & Redirect

- [ ] **`state` parameter wajib divalidasi** di callback (Passport strategy sudah bantu sebagian, pastikan tidak di-disable) — cegah CSRF di mana penyerang trigger callback pakai `code` miliknya sendiri ke akun korban
- [ ] **Redirect URI allowlist**: daftarkan persis di Google/GitHub Developer Console (`https://api.nodeline.id/api/v1/auth/google/callback`), **jangan** ada wildcard, jangan generate redirect URI dari input dinamis apapun
- [ ] **Open redirect prevention**: URL tujuan akhir setelah exchange (`redirect ke frontend`) harus dari allowlist domain sendiri, jangan pernah baca "redirect_to" dari query param yang bisa dikontrol user tanpa validasi — kalau butuh "redirect ke halaman sebelum login", validasi domain-nya harus sama dengan frontend sendiri
- [ ] **Ticket exchange**: satu ticket cuma valid 1x pakai, invalidasi begitu dipakai (atau expired), simpan minimal data di ticket payload (cukup `userId`, jangan taruh data sensitif lain)
- [ ] **HTTPS wajib** di redirect URI production (Google/GitHub sudah mewajibkan ini kecuali localhost dev)

---

## 6. Keamanan — Account Linking (bagian paling gampang salah)

Ini titik paling rawan **account takeover**: kalau penyerang bisa daftar akun Google/GitHub pakai email korban (atau email yang belum diverifikasi), lalu sistem "auto-link" ke akun existing korban berdasarkan kecocokan email saja → penyerang bisa ambil alih akun.

- [ ] **Google**: field `email_verified` dari Google profile **selalu ada**, gunakan itu — kalau `email_verified: false` (jarang tapi bisa terjadi), **jangan** auto-link ke akun existing, treat sebagai signup baru terpisah atau tolak dengan pesan jelas
- [ ] **GitHub**: default endpoint profil **tidak selalu** kasih email (bisa `null` kalau user set private) — wajib request scope `user:email` dan panggil `GET /user/emails` untuk dapat email primary + status verified. Kalau tidak ada email primary yang verified → jangan proses linking otomatis
- [ ] **Aturan linking yang aman**:
  - Kalau `email` dari provider **cocok** dengan `users.email` existing **DAN** `emailVerified: true` dari provider → boleh auto-link (email sama-sama sudah dibuktikan kepemilikannya oleh pihak ketiga terpercaya)
  - Kalau match tapi **tidak verified**, atau kamu mau lebih konservatif → jangan auto-link, arahkan user: "Email ini sudah terdaftar. Login dulu dengan password, lalu hubungkan akun Google dari halaman profile" (linking manual saat user sudah authenticated, bukan saat proses OAuth callback anonim)
- [ ] Sediakan endpoint linking manual terpisah untuk user yang **sudah login** (JWT) mau tambah provider ke akunnya: `POST /auth/oauth/link/:provider` (beda flow dari login) — supaya proses linking selalu terjadi dalam konteks user yang sudah terbukti identitasnya, bukan ditebak dari email
- [ ] **Minimal 1 metode login harus tetap ada**: kalau user OAuth-only (tanpa password) mencoba "unlink" provider satu-satunya yang dia punya → tolak, atau wajib set password dulu sebelum boleh unlink

---

## 7. Keamanan Lain

- [ ] **Jangan simpan access/refresh token dari Google/GitHub** kecuali memang butuh manggil API mereka lebih lanjut (mis. baca repo GitHub user) — kalau cuma buat login, ambil profil lalu **buang** token provider-nya, jangan disimpan permanen tanpa alasan
- [ ] Kalau **terpaksa** simpan provider token (misal butuh akses API lanjutan) → enkripsi at rest, jangan plaintext, dan minta scope se-minimal mungkin
- [ ] Jangan log `code`, `state`, atau isi profil mentah dari provider di server log
- [ ] Error handling: kalau user cancel consent / provider error → redirect ke halaman login frontend dengan pesan generik (`?error=oauth_failed`), **jangan** expose detail error internal (stack trace, provider response mentah) ke user
- [ ] Samakan kebijakan rate-limit & lockout dengan alur auth manual yang sudah ada — endpoint OAuth bukan celah untuk bypass proteksi brute-force/spam yang sudah didesain di fitur auth existing

---

## 8. Checklist Frontend (Next.js)

- [ ] Tombol "Login with Google" / "Login with GitHub" → **navigasi langsung** (`<a href="https://api.nodeline.id/api/v1/auth/google">`, bukan `fetch()`) — ini harus full page redirect, bukan AJAX
- [ ] Halaman `app/auth/callback/page.tsx` (Server Component atau Route Handler):
  - [ ] Baca `?ticket=` dari query
  - [ ] Panggil `POST /api/v1/auth/oauth/exchange` server-to-server
  - [ ] Set cookie `nl_access` httpOnly (fungsi yang sama seperti dipakai di flow login manual — reuse, jangan duplikasi logic)
  - [ ] Redirect ke halaman utama (atau ke halaman yang user tuju sebelumnya, dengan validasi domain sesuai §5)
  - [ ] Kalau ticket invalid/expired → redirect ke `/login?error=oauth_expired`
- [ ] Halaman login: tangani query `?error=` dari redirect, tampilkan toast pesan sesuai kode error (`oauth_failed`, `oauth_expired`, dll — mapping ke pesan ramah, jangan tampilkan raw error)
- [ ] Halaman profile: tampilkan provider yang sudah terhubung (Google/GitHub), tombol "Hubungkan" (kalau belum) / "Putuskan" (kalau sudah, dengan guard minimal-1-metode-login dari §6)

---

## 9. Edge Cases

- [ ] User sudah punya akun manual (email+password), lalu klik "Login with Google" pakai email yang sama tapi Google bilang `email_verified: false` → jangan auto-login ke akun lama, tampilkan pesan minta login manual dulu
- [ ] User daftar dulu lewat Google, lalu suatu saat mau punya password juga (supaya bisa login tanpa Google) → sediakan flow "Set Password" di halaman profile untuk user yang `passwordHash IS NULL`
- [ ] User klik "Login with GitHub" tapi akun GitHub-nya tidak ada email publik/verified sama sekali → tampilkan pesan jelas, minta set email publik di GitHub atau daftar manual
- [ ] 1 orang connect Google dan GitHub dengan email berbeda-beda ke 1 akun yang sama → itu hasil dari linking manual saat sudah login (§6), bukan otomatis dari proses signup
- [ ] Ticket dipakai 2x (retry double-submit dari browser) → percobaan kedua harus gagal jelas (ticket sudah dihapus), jangan silently create user baru
