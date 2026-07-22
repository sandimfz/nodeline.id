import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service.js';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    role: 'user' | 'god';
  };
}

/**
 * Gateway untuk fitur chat realtime.
 *
 * Autentikasi via one-time ticket (didapat dari POST /chat/ws-ticket).
 * Ticket dikirim di handshake: `io(URL, { auth: { ticket } })`.
 *
 * Security:
 * - Ticket one-time, expiry 30 detik
 * - Setiap event re-validate ownership conversation
 * - senderRole diambil dari socket.data, bukan dari payload client
 * - Rate limit per-socket: maks 10 pesan / 10 detik
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  maxHttpBufferSize: 1_048_576, // 1 MB — batas payload per event
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chat: ChatService) {}

  /**
   * Handle connection: validasi ticket.
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const ticket = socket.handshake.auth?.ticket as string | undefined;

      if (!ticket) {
        socket.emit('error', {
          code: 'NO_TICKET',
          message: 'Ticket tidak ditemukan',
        });
        socket.disconnect(true);
        return;
      }

      const userData = this.chat.consumeTicket(ticket);
      if (!userData) {
        socket.emit('error', {
          code: 'INVALID_TICKET',
          message: 'Ticket tidak valid atau sudah kadaluarsa',
        });
        socket.disconnect(true);
        return;
      }

      // Attach user data ke socket
      (socket as AuthenticatedSocket).data = {
        userId: userData.userId,
        role: userData.role as 'user' | 'god',
      };

      // Register socket
      this.chat.registerSocket(userData.userId, socket.id);

      console.log(
        `[WS] User ${userData.userId} (${userData.role}) connected — socket ${socket.id}`,
      );
    } catch (err) {
      socket.disconnect(true);
    }
  }

  /**
   * Handle disconnect: cleanup registry.
   */
  async handleDisconnect(socket: Socket): Promise<void> {
    const authSocket = socket as AuthenticatedSocket;
    // Cleanup rate limit entries
    this.cleanupRateLimit(socket.id);
    if (authSocket.data?.userId) {
      this.chat.unregisterSocket(authSocket.data.userId, socket.id);
      console.log(
        `[WS] User ${authSocket.data.userId} disconnected — socket ${socket.id}`,
      );
    }
  }

  /**
   * Join a conversation room.
   * Server validasi kepemilikan sebelum join.
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    socket: AuthenticatedSocket,
    payload: { conversationId: string },
  ): Promise<void> {
    const { conversationId } = payload;

    if (!conversationId) {
      throw new WsException('conversationId wajib diisi');
    }

    try {
      // Validate access
      await this.chat.validateConversationAccess(
        conversationId,
        socket.data.userId,
        socket.data.role,
      );

      await socket.join(`conv:${conversationId}`);
      socket.emit('conversation:joined', { conversationId });
    } catch {
      socket.emit('error', {
        code: 'ACCESS_DENIED',
        message: 'Tidak dapat join percakapan ini',
      });
    }
  }

  /**
   * Leave a conversation room.
   */
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    socket: AuthenticatedSocket,
    payload: { conversationId: string },
  ): Promise<void> {
    await socket.leave(`conv:${payload.conversationId}`);
  }

  /**
   * Send a message in a conversation.
   */
  @SubscribeMessage('message:send')
  async handleMessage(
    socket: AuthenticatedSocket,
    payload: { conversationId: string; content: string; tempId: string },
  ): Promise<void> {
    const { conversationId, content, tempId } = payload;

    // Validasi content
    if (!content || content.trim().length === 0) {
      socket.emit('error', {
        code: 'EMPTY_CONTENT',
        message: 'Pesan tidak boleh kosong',
      });
      return;
    }
    if (content.length > 4000) {
      socket.emit('error', {
        code: 'CONTENT_TOO_LONG',
        message: 'Pesan maksimal 4000 karakter',
      });
      return;
    }

    // Rate limit: max 10 pesan / 10 detik per socket
    if (!this.checkRateLimit(socket)) {
      socket.emit('error', {
        code: 'RATE_LIMITED',
        message: 'Terlalu cepat, mohon tunggu sebentar',
      });
      return;
    }

    try {
      // Cek ownership conversation
      await this.chat.validateConversationAccess(
        conversationId,
        socket.data.userId,
        socket.data.role,
      );

      // Auto-assign admin jika belum ada (saat admin pertama balas)
      if (socket.data.role === 'god') {
        await this.chat.ensureAdminAssigned(conversationId, socket.data.userId);
      }

      // Simpan ke DB dulu, baru broadcast
      const message = await this.chat.saveMessage({
        conversationId,
        senderId: socket.data.userId,
        senderRole: socket.data.role,
        content: content.trim(),
      });

      // Broadcast ke room (termasuk pengirim)
      this.server.to(`conv:${conversationId}`).emit('message:new', message);

      // Konfirmasi ke pengirim dengan tempId untuk optimistic UI reconcile
      socket.emit('message:ack', { tempId, message });
    } catch {
      socket.emit('error', {
        code: 'SEND_FAILED',
        message: 'Gagal mengirim pesan',
      });
    }
  }

  /**
   * Typing indicator: start.
   */
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    socket: AuthenticatedSocket,
    payload: { conversationId: string },
  ): Promise<void> {
    const { conversationId } = payload;
    socket.to(`conv:${conversationId}`).emit('typing:update', {
      conversationId,
      userId: socket.data.userId,
      isTyping: true,
    });
  }

  /**
   * Typing indicator: stop.
   */
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    socket: AuthenticatedSocket,
    payload: { conversationId: string },
  ): Promise<void> {
    const { conversationId } = payload;
    socket.to(`conv:${conversationId}`).emit('typing:update', {
      conversationId,
      userId: socket.data.userId,
      isTyping: false,
    });
  }

  // ── Internal helpers ──

  private rateLimitMap = new Map<string, number[]>();

  /**
   * Cleanup rate limit entries for disconnected sockets.
   */
  cleanupRateLimit(socketId: string): void {
    this.rateLimitMap.delete(socketId);
  }

  private checkRateLimit(socket: AuthenticatedSocket): boolean {
    const now = Date.now();
    const windowMs = 10_000; // 10 detik
    const maxMessages = 10;

    const timestamps = this.rateLimitMap.get(socket.id) ?? [];
    // Filter out expired timestamps
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= maxMessages) {
      this.rateLimitMap.set(socket.id, recent);
      return false;
    }

    recent.push(now);
    this.rateLimitMap.set(socket.id, recent);
    return true;
  }

  /**
   * Broadcast a new message to all participants in a conversation room.
   * Dipanggil dari ChatController saat admin kirim via REST.
   */
  async broadcastNewMessage(
    conversationId: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    this.server.to(`conv:${conversationId}`).emit('message:new', message);
  }

  /**
   * Broadcast conversation:closed event to all participants.
   */
  async broadcastConversationClosed(conversationId: string): Promise<void> {
    this.server
      .to(`conv:${conversationId}`)
      .emit('conversation:closed', { conversationId });
  }

  /**
   * Force-disconnect all sockets for a user.
   * Dipanggil saat logout / reuse detection.
   */
  forceDisconnectUser(userId: string): void {
    const socketIds = this.chat.getSocketIds(userId);
    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('error', {
          code: 'SESSION_REVOKED',
          message: 'Sesi Anda telah dihapus',
        });
        socket.disconnect(true);
      }
    }
  }
}
