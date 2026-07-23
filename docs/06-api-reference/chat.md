# Chat API

**Prefix:** `/api/v1/chat`

**Auth:** Semua endpoint membutuhkan JWT Access Token.

---

## REST Endpoints

### POST /chat/conversations

Get or create active conversation untuk user saat ini.

**Rate Limit:** 10 requests / 60 detik

Jika user sudah memiliki OPEN conversation, kembalikan yang sudah ada.

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "assignedAdminId": null,
  "status": "OPEN",
  "lastMessageAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /chat/conversations/me

Mendapatkan active conversation milik user saat ini.

**Response (200):**
```json
{
  "conversation": {
    "id": "uuid",
    "userId": "uuid",
    "assignedAdminId": null,
    "status": "OPEN",
    "lastMessageAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Atau `{ "conversation": null }` jika tidak ada conversation OPEN.

### GET /chat/conversations (God Only)

Mendapatkan semua conversations (admin view).

**Auth:** JWT + Role `god`

**Response (200):** Array of Conversation

### GET /chat/conversations/:id/messages

Mendapatkan pesan dalam conversation (cursor-based pagination).

**Query Parameters:**
- `cursor`: ISO timestamp untuk pagination (optional)
- `limit`: Jumlah pesan per page (default: 50)

**Anti-IDOR:** User hanya bisa akses conversation miliknya sendiri. God bisa akses semua.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "senderRole": "user",
    "content": "Halo, saya mau tanya",
    "attachmentUrl": null,
    "readAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /chat/conversations/:id/read

Mark all unread messages as read.

**Anti-IDOR:** Sama seperti di atas.

**Response (200):** `{ "message": "Marked as read" }`

### PATCH /chat/conversations/:id/close (God Only)

Menutup conversation.

**Auth:** JWT + Role `god`

**Response (200):** Updated Conversation object (status: CLOSED)

### POST /chat/conversations/:id/messages (God Only)

Mengirim pesan via REST (admin reply).

**Auth:** JWT + Role `god`

**Request:**
```json
{
  "content": "Baik, akan segera kami proses"
}
```

Pesan akan di-broadcast ke room Socket.IO agar user menerima realtime.

**Response (201):** Message object

### GET /chat/unread-count

Mendapatkan jumlah pesan yang belum dibaca.

- **User:** Menghitung pesan dari admin di conversation OPEN miliknya
- **God:** Menghitung semua pesan dari user di semua conversation OPEN

**Response (200):**
```json
{
  "count": 3
}
```

### POST /chat/ws-ticket

Generate one-time WebSocket ticket.

**Rate Limit:** 5 requests / 60 detik

**Response (200):**
```json
{
  "ticket": "ws_ticket_..."
}
```

Ticket berlaku 30 detik dan hanya bisa dipakai sekali.

---

## WebSocket Events

**Namespace:** `/chat`

### Connection

```javascript
const socket = io("ws://localhost:3000/chat", {
  auth: { ticket: "ws_ticket_..." },
  transports: ["websocket"],
});
```

### Client → Server Events

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `conversation:join` | `{ conversationId }` | Join room untuk menerima pesan realtime |
| `conversation:leave` | `{ conversationId }` | Leave room |
| `message:send` | `{ conversationId, content, tempId }` | Kirim pesan |
| `typing:start` | `{ conversationId }` | Mulai mengetik |
| `typing:stop` | `{ conversationId }` | Berhenti mengetik |

### Server → Client Events

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `message:new` | Message object | Pesan baru (broadcast ke room) |
| `message:ack` | `{ tempId, message }` | Konfirmasi pesan terkirim |
| `conversation:joined` | `{ conversationId }` | Berhasil join room |
| `conversation:closed` | `{ conversationId }` | Conversation ditutup admin |
| `typing:update` | `{ conversationId, userId, isTyping }` | Status typing |
| `error` | `{ code, message }` | Error dari server |

### Error Codes

| Code | Deskripsi |
|------|-----------|
| `NO_TICKET` | Ticket tidak disertakan di handshake |
| `INVALID_TICKET` | Ticket tidak valid atau expired |
| `ACCESS_DENIED` | Tidak bisa join conversation |
| `EMPTY_CONTENT` | Pesan kosong |
| `CONTENT_TOO_LONG` | Pesan > 4000 karakter |
| `RATE_LIMITED` | Terlalu cepat (max 10 msg / 10 detik) |
| `SEND_FAILED` | Gagal mengirim |
| `SESSION_REVOKED` | Sesi dihapus (logout / reuse detection) |

### Rate Limit

- Max 10 pesan per 10 detik per socket
- Validasi content: 1-4000 karakter
- Max payload: 1 MB per event
