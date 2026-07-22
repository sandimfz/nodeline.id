import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, eq, desc, lt, isNull, ne, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import {
  conversations,
  messages,
} from '../../database/drizzle/schema/index.js';
import type { Conversation } from '../../database/drizzle/schema/conversations.schema.js';
import type { Message } from '../../database/drizzle/schema/messages.schema.js';

/**
 * In-memory registry for ticket → { userId, role, expiresAt } mapping.
 * Single-instance: untuk multi-instance, pindah ke Redis.
 */
interface TicketEntry {
  userId: string;
  role: string;
  expiresAt: number;
}

/**
 * In-memory registry for active Socket.IO connections.
 * Maps userId → Set<socketId> (1 user bisa punya banyak koneksi).
 */
const socketRegistry = new Map<string, Set<string>>();

/**
 * In-memory ticket store. One-time tickets, 30 detik expiry.
 */
const ticketStore = new Map<string, TicketEntry>();

// Cleanup expired tickets setiap 30 detik
setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of ticketStore) {
    if (entry.expiresAt < now) {
      ticketStore.delete(ticket);
    }
  }
}, 30_000);

@Injectable()
export class ChatService {
  constructor(private readonly drizzle: DrizzleService) {}

  // ── Ticket Management ──

  /**
   * Generate one-time WS ticket.
   */
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

  /**
   * Validate dan consume one-time ticket.
   * Returns user data jika valid, null jika tidak.
   */
  consumeTicket(ticket: string): { userId: string; role: string } | null {
    const entry = ticketStore.get(ticket);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      ticketStore.delete(ticket);
      return null;
    }
    ticketStore.delete(ticket); // one-time use
    return { userId: entry.userId, role: entry.role };
  }

  // ── Socket Registry ──

  registerSocket(userId: string, socketId: string): void {
    if (!socketRegistry.has(userId)) {
      socketRegistry.set(userId, new Set());
    }
    socketRegistry.get(userId)!.add(socketId);
  }

  unregisterSocket(userId: string, socketId: string): void {
    const sockets = socketRegistry.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      socketRegistry.delete(userId);
    }
  }

  getSocketIds(userId: string): string[] {
    return Array.from(socketRegistry.get(userId) ?? []);
  }

  /**
   * Force-disconnect semua socket milik userId (saat logout / reuse detection).
   */
  getAllSocketIds(): Map<string, Set<string>> {
    return socketRegistry;
  }

  // ── Conversations ──

  /**
   * Get or create active conversation for a user.
   * Jika user sudah punya OPEN conversation, kembalikan yang sudah ada.
   */
  async getOrCreateConversation(userId: string): Promise<Conversation> {
    // Cari OPEN conversation milik user
    const [existing] = await this.drizzle.db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.userId, userId), eq(conversations.status, 'OPEN')),
      )
      .limit(1);

    if (existing) return existing;

    // Buat baru
    const [created] = await this.drizzle.db
      .insert(conversations)
      .values({ userId })
      .returning();

    return created;
  }

  /**
   * Get conversations for admin (god) — all conversations, sorted by lastMessageAt desc.
   */
  async getConversationsForAdmin(): Promise<Conversation[]> {
    return this.drizzle.db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));
  }

  /**
   * Get active conversation for a user.
   */
  async getMyConversation(userId: string): Promise<Conversation | null> {
    const [conv] = await this.drizzle.db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.userId, userId), eq(conversations.status, 'OPEN')),
      )
      .limit(1);
    return conv ?? null;
  }

  // ── Messages ──

  /**
   * Get messages for a conversation, paginated by cursor.
   */
  async getMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<Message[]> {
    const conditions = [eq(messages.conversationId, conversationId)];
    if (cursor) {
      conditions.push(lt(messages.createdAt, new Date(cursor)));
    }

    return this.drizzle.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1); // ambil 1 extra untuk tau apakah ada lagi
  }

  /**
   * Save a message to DB.
   */
  async saveMessage(data: {
    conversationId: string;
    senderId: string;
    senderRole: 'user' | 'god';
    content: string;
  }): Promise<Message> {
    const [msg] = await this.drizzle.db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderRole: data.senderRole,
        content: data.content,
      })
      .returning();

    // Update lastMessageAt di conversation
    await this.drizzle.db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));

    return msg;
  }

  /**
   * Mark messages as read in a conversation.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          // Only mark messages NOT sent by us as read
          ne(messages.senderId, userId),
          isNull(messages.readAt),
        ),
      );
  }

  /**
   * Close a conversation (god only).
   */
  async closeConversation(conversationId: string): Promise<Conversation> {
    const [updated] = await this.drizzle.db
      .update(conversations)
      .set({ status: 'CLOSED', updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Percakapan tidak ditemukan');
    }
    return updated;
  }

  // ── Validation ──

  /**
   * Validate bahwa user adalah pemilik conversation atau admin.
   */
  async validateConversationAccess(
    conversationId: string,
    userId: string,
    role: string,
  ): Promise<Conversation> {
    const [conv] = await this.drizzle.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      throw new NotFoundException('Percakapan tidak ditemukan');
    }

    // Admin (god) bisa akses semua, user hanya bisa punya sendiri
    if (role !== 'god' && conv.userId !== userId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke percakapan ini',
      );
    }

    return conv;
  }

  /**
   * Get conversation ownership info untuk event validation.
   */
  async getConversationOwner(
    conversationId: string,
  ): Promise<{ userId: string; assignedAdminId: string | null } | null> {
    const [conv] = await this.drizzle.db
      .select({
        userId: conversations.userId,
        assignedAdminId: conversations.assignedAdminId,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    return conv ?? null;
  }

  /**
   * Get unread message count for user's open conversation.
   * User counts unread from admins, admin counts unread from users.
   */
  async getUnreadCount(userId: string, role: string): Promise<number> {
    if (role === 'god') {
      // Admin: count unread messages across all open conversations sent by users
      const [result] = await this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.status, 'OPEN'),
            eq(messages.senderRole, 'user'),
            isNull(messages.readAt),
          ),
        );
      return result?.count ?? 0;
    }

    // User: count unread from admins in their open conversation
    const [conv] = await this.drizzle.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.userId, userId), eq(conversations.status, 'OPEN')),
      )
      .limit(1);

    if (!conv) return 0;

    const [result] = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conv.id),
          ne(messages.senderId, userId),
          isNull(messages.readAt),
        ),
      );
    return result?.count ?? 0;
  }

  /**
   * Auto-assign admin ke conversation jika belum ada.
   */
  async ensureAdminAssigned(
    conversationId: string,
    adminId: string,
  ): Promise<void> {
    const [conv] = await this.drizzle.db
      .select({ assignedAdminId: conversations.assignedAdminId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (conv && !conv.assignedAdminId) {
      await this.drizzle.db
        .update(conversations)
        .set({ assignedAdminId: adminId, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  }
}
