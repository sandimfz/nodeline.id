# 08. Database Schema

**Database:** PostgreSQL 16+
**ORM:** Drizzle ORM (schema-based, dengan migrasi SQL auto-generated)
**Migrations:** `api/src/database/drizzle/migrations/`

---

## Entity Relationship Diagram (Textual)

```
users
  ├── refresh_tokens (1:N)
  ├── products (1:N, as seller)
  ├── orders (1:N, as buyer)
  ├── conversations (1:N, as user)
  └── conversations (1:N, as assignedAdmin)
        └── messages (1:N)

products
  ├── categories (N:1)
  ├── stock_units (1:N)
  │     └── fulfillments (1:N)
  └── order_items (1:N)
        └── fulfillments (1:N)

orders
  └── order_items (1:N)
        └── fulfillments (1:N)

audit_logs (standalone)
payment_methods (standalone)
```

---

## Tabel Detail

### users

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| email | varchar(255) | NOT NULL, UNIQUE | |
| password_hash | varchar(255) | NOT NULL | Argon2id hash |
| name | varchar(100) | NOT NULL | |
| role | user_role enum | NOT NULL, default 'user' | 'user' atau 'god' |
| is_email_verified | boolean | NOT NULL, default false | |
| avatar_url | varchar(500) | nullable | URL ke R2 |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |

**Enum:** `user_role` = 'user' | 'god'

---

### refresh_tokens

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| user_id | uuid | FK → users(id) ON DELETE CASCADE | |
| token_hash | varchar(255) | NOT NULL, UNIQUE | SHA256 hash dari raw refresh token |
| replaced_by_token_hash | varchar(255) | nullable | Token baru saat rotasi |
| is_revoked | boolean | NOT NULL, default false | |
| expires_at | timestamp | NOT NULL | |
| created_at | timestamp | NOT NULL, defaultNow() | |

---

### products

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| seller_id | uuid | FK → users(id) | |
| name | varchar(200) | NOT NULL | |
| description | text | nullable | |
| price_cents | integer | NOT NULL | Harga dalam sen (Rp) |
| keys_per_unit | integer | NOT NULL, default 1 | Jumlah key per unit stok |
| is_active | boolean | NOT NULL, default true | |
| low_stock_threshold | integer | NOT NULL, default 5 | |
| warranty_period_days | integer | nullable | (belum diimplementasikan) |
| max_warranty_claims | integer | nullable | (belum diimplementasikan) |
| image_url | varchar(500) | nullable | |
| category_id | uuid | FK → categories(id) | nullable |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |

---

### categories

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| name | varchar(100) | NOT NULL | |
| slug | varchar(100) | NOT NULL, UNIQUE | Auto-generated dari name |
| created_at | timestamp | NOT NULL, defaultNow() | |

---

### stock_units

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| product_id | uuid | FK → products(id) ON DELETE CASCADE | |
| encrypted_content | text | NOT NULL | AES-256-GCM encrypted |
| status | stock_unit_status enum | NOT NULL, default 'AVAILABLE' | 'AVAILABLE', 'SOLD', 'REVOKED' |
| created_at | timestamp | NOT NULL, defaultNow() | |
| sold_at | timestamp | nullable | |

**Enum:** `stock_unit_status` = 'AVAILABLE' | 'SOLD' | 'REVOKED'

---

### orders

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| buyer_id | uuid | FK → users(id) | |
| whatsapp_number | varchar(20) | NOT NULL | |
| status | order_status enum | NOT NULL, default 'PENDING_PAYMENT_CONFIRMATION' | Lihat enum di bawah |
| total_cents | integer | NOT NULL | |
| payment_note | text | nullable | Catatan pembayaran + [BUKTI BAYAR] URL |
| cancellation_note | text | nullable | Alasan cancel/refund dari admin |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |

**Enum:** `order_status` = 'PENDING_PAYMENT_CONFIRMATION' | 'PAID_PENDING_FULFILLMENT' | 'FULFILLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED'

**Status Flow:**
```
PENDING_PAYMENT_CONFIRMATION  ──(confirm payment)──→  PAID_PENDING_FULFILLMENT ──(auto-fulfill)──→  FULFILLED
         │                                                      │                                               │
         └──(admin cancel)──→  CANCELLED                        └──(admin cancel)──→  CANCELLED                 └──(admin refund)──→  REFUNDED
```

*Catatan: Status `REFUND_REQUESTED` sudah ada di enum untuk future use (request dari pembeli), namun saat ini admin bisa langsung merefund dari status `FULFILLED` ke `REFUNDED`.*

---

### order_items

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| order_id | uuid | FK → orders(id) ON DELETE CASCADE | |
| product_id | uuid | FK → products(id) | |
| quantity | integer | NOT NULL, default 1 | |
| price_cents | integer | NOT NULL | Snapshot harga saat checkout |

---

### fulfillments

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| order_item_id | uuid | FK → order_items(id) | |
| stock_unit_id | uuid | FK → stock_units(id) | |
| is_active | boolean | NOT NULL, default true | false jika diganti (warranty) |
| assigned_by | uuid | nullable | null = auto-assign, UUID = manual |
| created_at | timestamp | NOT NULL, defaultNow() | |

---

### conversations

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| user_id | uuid | FK → users(id) | |
| assigned_admin_id | uuid | FK → users(id) | nullable, di-set saat admin pertama balas |
| status | conversation_status enum | NOT NULL, default 'OPEN' | 'OPEN' atau 'CLOSED' |
| last_message_at | timestamp | nullable | |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |

**Enum:** `conversation_status` = 'OPEN' | 'CLOSED'

---

### messages

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| conversation_id | uuid | FK → conversations(id) ON DELETE CASCADE | |
| sender_id | uuid | FK → users(id) | |
| sender_role | varchar(10) | NOT NULL, default 'user' | 'user' atau 'god' |
| content | text | NOT NULL | |
| attachment_url | varchar(500) | nullable | (belum diimplementasikan) |
| read_at | timestamp | nullable | |
| created_at | timestamp | NOT NULL, defaultNow() | |

**Index:** Dibutuhkan index composite pada `(conversation_id, created_at)` untuk pagination. Drizzle tidak support partial index di DDL definitions, jadi perlu ditambahkan manual di migrasi.

---

### audit_logs

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| actor_id | uuid | FK → users(id) | nullable (system action) |
| action | varchar(64) | NOT NULL | 'RESTOCK', 'CONFIRM_PAYMENT', 'AUTO_FULFILL', 'MANUAL_ASSIGN', 'ADD_UNIT', 'CANCEL', 'REFUND' |
| entity | varchar(64) | nullable | 'product', 'order', 'order_item' |
| entity_id | uuid | nullable | |
| meta | jsonb | nullable | Data tambahan (count, dll.) |
| created_at | timestamp | NOT NULL, defaultNow() | |

---

### payment_methods

| Column | Type | Constraint | Deskripsi |
|--------|------|-----------|-----------|
| id | uuid | PK, defaultRandom() | |
| type | payment_method_type enum | NOT NULL | 'bank_transfer' atau 'qris' |
| name | varchar(200) | NOT NULL | |
| image_url | varchar(500) | NOT NULL | |
| account_number | varchar(50) | nullable | Untuk bank_transfer |
| account_name | varchar(200) | nullable | Untuk bank_transfer |
| is_active | boolean | NOT NULL, default true | |
| sort_order | integer | NOT NULL, default 0 | Urutan tampilan |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |

**Enum:** `payment_method_type` = 'bank_transfer' | 'qris'

---

## Tabel: `api_services`

Katalog API yang ditampilkan di API Directory.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|-----------|------------|
| id | uuid | PK, defaultRandom() | |
| slug | varchar(100) | NOT NULL, UNIQUE | Format `^[a-z0-9-]+$` |
| name | varchar(200) | NOT NULL | |
| description | text | | Markdown, di-sanitize saat render |
| short_description | varchar(300) | | Untuk card di listing |
| category | varchar(50) | NOT NULL | trading, entertainment, utility, dll |
| base_url | varchar(500) | NOT NULL | Harus endpoint yang di-guard ApiKeyGuard |
| logo_url | varchar(500) | | |
| pricing_type | enum | NOT NULL, default 'FREE' | |
| status | enum | NOT NULL, default 'ACTIVE' | Kontrol on/off dari admin |
| version | varchar(20) | NOT NULL, default 'v1' | |
| is_published | boolean | NOT NULL, default false | Kontrol on/off dari admin |
| sort_order | integer | NOT NULL, default 0 | |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |

**Enum:** `api_service_pricing_type` = 'FREE' | 'FREEMIUM' | 'PAID'
**Enum:** `api_service_status` = 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED'

`is_published` dan `status` dibaca oleh `ServiceStatusGuard` untuk memblokir endpoint publik saat API dinonaktifkan dari admin.

---

## Tabel: `api_endpoints`

Dokumentasi endpoint per API service.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|-----------|------------|
| id | uuid | PK, defaultRandom() | |
| service_id | uuid | FK → api_services, CASCADE | |
| method | varchar(10) | NOT NULL | GET, POST, PUT, PATCH, DELETE |
| path | varchar(200) | NOT NULL | Contoh: `/prices/:symbol` |
| summary | varchar(300) | | |
| description | text | | Markdown |
| request_example | jsonb | | |
| response_example | jsonb | | |
| is_premium | boolean | NOT NULL, default false | Hanya untuk plan berbayar |
| sort_order | integer | NOT NULL, default 0 | |

---

## Tabel: `api_plans`

Pricing plan per API service.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|-----------|------------|
| id | uuid | PK, defaultRandom() | |
| service_id | uuid | FK → api_services, CASCADE | |
| name | varchar(50) | NOT NULL | FREE, PRO, ENTERPRISE |
| price_cents | integer | NOT NULL, default 0 | Harga per bulan |
| requests_per_day | integer | NULL = unlimited | Jangan pakai sentinel -1 |
| requests_per_minute | integer | NOT NULL, default 60 | |
| features | jsonb | | Array string |
| is_active | boolean | NOT NULL, default true | |
| sort_order | integer | NOT NULL, default 0 | |

---

## Tabel: `api_subscriptions`

Menghubungkan API key ke service + plan. Satu key bisa berlangganan banyak service.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|-----------|------------|
| id | uuid | PK, defaultRandom() | |
| api_key_id | uuid | FK → api_keys, CASCADE | |
| service_id | uuid | FK → api_services, CASCADE | |
| plan_id | uuid | FK → api_plans | |
| status | enum | NOT NULL, default 'ACTIVE' | |
| quota_used_today | integer | NOT NULL, default 0 | |
| quota_reset_at | timestamp | | 00:00 UTC berikutnya |
| created_at | timestamp | NOT NULL, defaultNow() | |
| updated_at | timestamp | NOT NULL, defaultNow() | |
| cancelled_at | timestamp | | |

**Enum:** `api_subscription_status` = 'ACTIVE' | 'CANCELLED' | 'SUSPENDED'
**Unique:** `(api_key_id, service_id)` — satu key hanya bisa punya satu subscription aktif per service

---

## Perubahan pada `users` untuk OAuth

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| password_hash | varchar(255) | **Sekarang nullable** — user OAuth tidak punya password |
| oauth_provider | varchar(20) | 'google' \| 'github' \| NULL |
| oauth_id | varchar(255) | User ID dari provider |

Login dengan password menolak user yang `password_hash`-nya NULL.

---

## Catatan: Pola Query Paginated

Endpoint paginated **tidak** melakukan query COUNT terpisah. Total dibawa oleh window function dalam query yang sama:

```typescript
const rows = await db
  .select({
    ...fields,
    total: sql<number>`count(*) over()::int`,
  })
  .from(table)
  .where(and(...conditions))
  .limit(limit)
  .offset(offset);

const total = rows[0]?.total ?? 0;
```

Alasannya: setiap round-trip ke DB ~300ms termasuk network. Dua query = dua kali biaya itu. Lihat [15. Smooth UX Rules](./15-smooth-ux-rules.md) §5.

---

## Drizzle ORM Configuration

**File:** `drizzle.config.ts` (root project)

```typescript
export default {
  schema: './api/src/database/drizzle/schema/*.schema.ts',
  out: './api/src/database/drizzle/migrations',
  dialect: 'postgresql',
};
```

**Commands:**

```bash
# Generate migration dari schema changes
pnpm --filter api db:generate

# Push migration ke database
pnpm --filter api db:push

# Buka Drizzle Studio (GUI)
pnpm --filter api db:studio
```
