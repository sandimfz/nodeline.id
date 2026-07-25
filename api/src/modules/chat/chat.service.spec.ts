import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import { ChatService } from './chat.service.js';
import configuration from '../../config/configuration.js';
import { envValidationSchema } from '../../config/validation.schema.js';
import {
  users,
  conversations,
  messages,
} from '../../database/drizzle/schema/index.js';

/**
 * Integration test for ChatService against the real database.
 * Tests ticket generation/consumption, conversations, and messaging.
 */
describe('ChatService', () => {
  let module: TestingModule;
  let service: ChatService;
  let db: DrizzleService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: (raw) => {
            const result = envValidationSchema.safeParse(raw);
            if (!result.success) {
              throw new Error(
                'Invalid env for tests: ' +
                  result.error.issues.map((i) => i.message).join('; '),
              );
            }
            return result.data;
          },
        }),
      ],
      providers: [ChatService, DrizzleService],
    }).compile();

    service = module.get(ChatService);
    db = module.get(DrizzleService);
    db.onModuleInit();
  });

  afterAll(async () => {
    // Cleanup test data first, then close module
    if (db?.db) {
      const userConvs = await db.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .catch(() => []);

      for (const conv of userConvs) {
        await db.db.delete(messages).where(eq(messages.conversationId, conv.id)).catch(() => {});
      }
      await db.db.delete(conversations).where(eq(conversations.userId, userId)).catch(() => {});
      await db.db.delete(users).where(eq(users.id, userId)).catch(() => {});
      await db.db.delete(users).where(eq(users.id, adminId)).catch(() => {});
    }
    await db.onModuleDestroy().catch(() => {});
    await module.close();
  });

  let userId: string = '';
  let adminId: string = '';

  beforeAll(async () => {
    // Create test user
    const [user] = await db.db
      .insert(users)
      .values({
        email: `spec_chat_user_${Date.now()}@nodeline.test`,
        passwordHash: 'argon2-placeholder',
        name: 'Chat Spec User',
        role: 'user',
      })
      .returning({ id: users.id });
    userId = user.id;

    // Create test admin
    const [admin] = await db.db
      .insert(users)
      .values({
        email: `spec_chat_admin_${Date.now()}@nodeline.test`,
        passwordHash: 'argon2-placeholder',
        name: 'Chat Spec Admin',
        role: 'god',
      })
      .returning({ id: users.id });
    adminId = admin.id;
  });

  describe('ticket generation & consumption', () => {
    it('generates a valid one-time ticket', () => {
      const ticket = service.generateTicket(userId, 'user');

      expect(ticket).toMatch(/^ws_ticket_/);
      expect(ticket.length).toBeGreaterThan(20);
    });

    it('consumes a valid ticket and returns user data', () => {
      const ticket = service.generateTicket(userId, 'user');
      const result = service.consumeTicket(ticket);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(userId);
      expect(result!.role).toBe('user');
    });

    it('returns null for consumed ticket (one-time)', () => {
      const ticket = service.generateTicket(userId, 'user');
      service.consumeTicket(ticket);

      // Second consume should fail
      const result = service.consumeTicket(ticket);
      expect(result).toBeNull();
    });

    it('returns null for unknown ticket', () => {
      const result = service.consumeTicket('ws_ticket_invalid');
      expect(result).toBeNull();
    });
  });

  describe('conversation management', () => {
    it('creates a new conversation for a user', async () => {
      const conv = await service.getOrCreateConversation(userId);

      expect(conv).toBeDefined();
      expect(conv.userId).toBe(userId);
      expect(conv.status).toBe('OPEN');

      // Cleanup specific to this test
      await db.db.delete(conversations).where(eq(conversations.id, conv.id));
    });

    it('returns existing open conversation if available', async () => {
      // Create first conversation
      const first = await service.getOrCreateConversation(userId);

      // Second call should return the same one
      const second = await service.getOrCreateConversation(userId);

      expect(second.id).toBe(first.id);

      // Cleanup
      await db.db.delete(conversations).where(eq(conversations.id, first.id));
    });

    it('returns all conversations for admin view', async () => {
      const conv = await service.getOrCreateConversation(userId);
      const allConvs = await service.getConversationsForAdmin();

      expect(Array.isArray(allConvs)).toBe(true);

      // Cleanup
      await db.db.delete(conversations).where(eq(conversations.id, conv.id));
    });

    it('closes an open conversation', async () => {
      const conv = await service.getOrCreateConversation(userId);
      const closed = await service.closeConversation(conv.id);

      expect(closed.status).toBe('CLOSED');

      // Cleanup
      await db.db.delete(conversations).where(eq(conversations.id, conv.id));
    });
  });

  describe('messaging', () => {
    it('saves a message and updates conversation lastMessageAt', async () => {
      const conv = await service.getOrCreateConversation(userId);

      const msg = await service.saveMessage({
        conversationId: conv.id,
        senderId: userId,
        senderRole: 'user',
        content: 'Test message content',
      });

      expect(msg).toBeDefined();
      expect(msg.conversationId).toBe(conv.id);
      expect(msg.content).toBe('Test message content');
      expect(msg.senderRole).toBe('user');

      // Cleanup
      await db.db.delete(messages).where(eq(messages.id, msg.id));
      await db.db.delete(conversations).where(eq(conversations.id, conv.id));
    });

    it('retrieves messages for a conversation', async () => {
      const conv = await service.getOrCreateConversation(userId);

      // Save a message
      await service.saveMessage({
        conversationId: conv.id,
        senderId: userId,
        senderRole: 'user',
        content: 'Test message',
      });

      const msgs = await service.getMessages(conv.id);
      expect(Array.isArray(msgs)).toBe(true);
      expect(msgs.length).toBeGreaterThan(0);

      // Cleanup
      for (const m of msgs) {
        await db.db.delete(messages).where(eq(messages.id, m.id));
      }
      await db.db.delete(conversations).where(eq(conversations.id, conv.id));
    });

    it('validates access for conversation owner', async () => {
      const conv = await service.getOrCreateConversation(userId);

      // Owner should have access
      const result = await service.validateConversationAccess(
        conv.id,
        userId,
        'user',
      );
      expect(result.id).toBe(conv.id);

      // Non-owner user should be denied
      await expect(
        service.validateConversationAccess(conv.id, adminId, 'user'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // Admin (god) should have access to any conversation
      const adminResult = await service.validateConversationAccess(
        conv.id,
        adminId,
        'god',
      );
      expect(adminResult.id).toBe(conv.id);

      // Cleanup
      await db.db.delete(conversations).where(eq(conversations.id, conv.id));
    });

    it('returns 404 for non-existent conversation', async () => {
      await expect(
        service.validateConversationAccess(
          '00000000-0000-0000-0000-000000000000',
          userId,
          'user',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
