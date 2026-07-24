# Categories API

**Prefix:** `/api/v1/categories`

---

## Public Endpoints

### GET /categories

Mendapatkan semua kategori.

**Auth:** None (public)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Template",
    "slug": "template",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

## Admin Endpoints (God Only)

**Prefix:** `/api/v1/categories/admin`

**Auth:** JWT + Role `god`

### POST /categories/admin

Membuat kategori baru.

**Request:**
```json
{
  "name": "Template"
}
```

Slug akan di-generate otomatis dari name.

**Response (201):** Category object

**Error (409):** `"Kategori dengan nama tersebut sudah ada"`

### DELETE /categories/admin/:id

Hapus kategori.

**Response (200):** `{ "message": "Kategori dihapus" }`
