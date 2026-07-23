# 09. Realtime (WebSocket)

## Technology

- **Library:** Socket.IO (v4.8.3)
- **Namespace:** `/chat`
- **Backend:** `@nestjs/platform-socket.io` + `@nestjs/websockets`
- **Client:** `socket.io-client` (v4.8.3)
- **Transport:** WebSocket only (no long-polling)

---

## Arsitektur

```
Client (Browser)                    Server (NestJS)
      │                                  │
      │ 1. POST /chat/ws-ticket          │
      │    → one-time ticket (30s)       │
      │◄── { ticket }                    │
      │                                  │
      │ 2. io("/chat", { auth: { ticket }}) │
      │─────────────────────────────────►│
      │                                  │ ChatGateway
      │                                  ├── consumeTicket()
      │                                  ├── registerSocket()
      │                                  └── join room conv:{id}
      │                                  │
      │ 3. emit("message:send", {...})   │
      │─────────────────────────────────►│
      │                                  ├── rate limit check
      │                                  ├── validate access
      │                                  ├── saveMessage()
      │                                  └── broadcast to room
      │◄── emit("message:new", {...})    │
      │◄── emit("message:ack", {...})    │
```

---

## Keamanan

### One-Time Ticket Authentication

Tidak seperti WebSocket tradisional yang menggunakan JWT di handshake (yang bisa expire saat koneksi panjang), Nodeline.id menggunakan one-time ticket:

```typescript
// Generate
generateTicket(userId: string, role: string): string {
  const raw = randomBytes(32).toString('base64url');
  const ticket = `ws_ticket_${raw}`;
  ticketStore.set(ticket, {
    userId,
    role,
    expiresAt: Date.now() + 30_000, // 30 detik
  });
  return ticket;
}

// Consume (one-time)
consumeTicket(ticket: string): { userId: string; role: string } | null {
  const entry = ticketStore.get(ticket);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { ticketStore.delete(ticket); return null; }
  ticketStore.delete(ticket); // one-time use
  return { userId: entry.userId, role: entry.role };
}
```

### Validasi Per Event

Setiap event WebSocket divalidasi:
- `senderRole` diambil dari `socket.data`, bukan dari payload client
- Setiap `message:send` memvalidasi ownership conversation
- Rate limit: max 10 pesan / 10 detik per socket
- Content validation: 1-4000 karakter

---

## Server Components

### ChatGateway (`chat.gateway.ts`)
- `@WebSocketGateway({ namespace: '/chat', cors: {...} })`
- CORS origins dari env
- Payload limit: 1 MB

### In-Memory Registry

**Socket Registry:** `Map<userId, Set<socketId>>`
- Satu user bisa memiliki banyak koneksi (multi-tab)
- Cleanup otomatis saat disconnect

**Ticket Store:** `Map<ticket, { userId, role, expiresAt }>`
- Cleanup setiap 30 detik (setInterval)
- Ticket di-delete setelah dipakai (one-time)

> **Catatan:** Kedua registry ini in-memory. Untuk deployment multi-instance, perlu dipindahkan ke Redis.

---

## Event Reference

### Client → Server

| Event | Payload | Validasi | Deskripsi |
|-------|---------|----------|-----------|
| `conversation:join` | `{ conversationId }` | Ownership check | Join room untuk realtime messages |
| `conversation:leave` | `{ conversationId }` | - | Leave room |
| `message:send` | `{ conversationId, content, tempId }` | Ownership + rate limit + content length | Kirim pesan |
| `typing:start` | `{ conversationId }` | - | Broadcast typing status |
| `typing:stop` | `{ conversationId }` | - | Hapus typing status |

### Server → Client

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `message:new` | Full message object (including id, createdAt) | Pesan baru (broadcast ke room) |
| `message:ack` | `{ tempId, message }` | Konfirmasi ke pengirim dengan ID asli |
| `conversation:joined` | `{ conversationId }` | Berhasil join room |
| `conversation:closed` | `{ conversationId }` | Conversation ditutup admin |
| `typing:update` | `{ conversationId, userId, isTyping }` | Status typing |
| `error` | `{ code, message }` | Error (bisa disconnect) |

---

## Client Implementation (`client/features/chat/`)

### Socket Singleton (`socket.ts`)

Pattern singleton dengan auto-reconnect:

```typescript
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  // close existing, fetch new ticket, connect
  const { ticket } = await getWsTicket();
  socket = io(`${wsUrl}/chat`, {
    auth: { ticket },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });
  return new Promise((resolve, reject) => { ... });
}
```

### Optimistic Updates (`hooks.ts`)

`useSendMessage` menggunakan optimistic UI:
1. `onMutate`: Tambah pesan sementara ke cache dengan `tempId`
2. `onSuccess`: Replace pesan sementara dengan pesan asli dari server (`message:ack`)
3. `onError`: Rollback cache ke snapshot sebelumnya

### Real-time Message Append (`useChatSocket`)

Mendengarkan event `message:new` dan append ke infinite query cache. Juga mengecek duplikat (dari optimistic ack).

---

## Admin Panel Chat

Admin menggunakan REST endpoint untuk mengirim pesan (bukan WebSocket):

```http
POST /api/v1/chat/conversations/:id/messages
```

Pesan kemudian di-broadcast via WebSocket oleh gateway:

```typescript
await this.chatGateway.broadcastNewMessage(conversationId, message);
```

Ini memungkinkan admin panel (yang menggunakan Axios, bukan Socket.IO client) tetap bisa mengirim pesan realtime.
