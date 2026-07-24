# 06. API Reference

Seluruh API diakses melalui base URL:

- Development: `http://localhost:3000/api/v1`
- Production: `https://api.nodeline.id/api/v1` (perlu dikonfirmasi)

## Konvensi

- **Global prefix:** `/api/v1`
- **Auth header:** `Authorization: Bearer <access_token>` (untuk JWT-protected endpoints)
- **Refresh token:** httpOnly cookie (client) atau body field (admin)
- **Response format:** JSON
- **Error format:**
  ```json
  {
    "statusCode": 400,
    "message": "Pesan error",
    "error": "Bad Request"
  }
  ```
- **Pagination:** Cursor-based (chat messages), parameter `cursor` dan `limit`
- **Rate limit:** Bervariasi per endpoint (umum: 100 request/60 detik)

## Modul API

| Modul | Prefix | File | Auth |
|-------|--------|------|------|
| [Auth](./auth.md) | `/auth` | Auth Controller | Public / JWT / Refresh |
| [Products](./products.md) | `/products` | Products Controller + Admin Controller | Public / JWT + God |
| [Orders](./orders.md) | `/orders` | Orders Controller | JWT |
| [Payments](./payments.md) | `/payments` | Payments Controller | JWT + God |
| [Stock](./stock.md) | `/stock` | Stock Controller | JWT + God |
| [Storage](./storage.md) | `/storage` | Storage Controller | JWT |
| [Categories](./categories.md) | `/categories` | Categories Controller | Public / JWT + God |
| [Payment Methods](./payment-methods.md) | `/payment-methods` | Payment Methods Controller | Public / JWT + God |
| [Chat](./chat.md) | `/chat` | Chat Controller | JWT |
| [Market Data](./market-data.md) | `/market` | Public API Controller | API Key |
| [API Keys](./api-keys.md) | `/api-keys` | API Keys Controller | JWT |
| [Health Check](#health-check) | `/health` | App Controller | Public |

---

## Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
