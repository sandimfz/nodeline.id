import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { OrdersService } from './orders.service.js';
import { StockCryptoUtil } from '../../../common/crypto/stock-crypto.util.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';
import { ChatService } from '../../chat/chat.service.js';
import { ChatGateway } from '../../chat/chat.gateway.js';
import configuration from '../../../config/configuration.js';
import { envValidationSchema } from '../../../config/validation.schema.js';
import {
  users,
  products,
  stockUnits,
  orders,
} from '../../../database/drizzle/schema/index.js';

/**
 * Integration test for OrdersService against the real database.
 * Tests checkout flow, order queries, and cancellation.
 */
describe('OrdersService', () => {
  let module: TestingModule;
  let service: OrdersService;
  let db: DrizzleService;
  let chatService: ChatService;

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
      providers: [
        OrdersService,
        DrizzleService,
        StockCryptoUtil,
        AuditLogService,
        ChatService,
        {
          provide: ChatGateway,
          useValue: {
            broadcastNewMessage: jest.fn(),
            broadcastConversationClosed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    db = module.get(DrizzleService);
    chatService = module.get(ChatService);
    db.onModuleInit();
  });

  afterAll(async () => {
    // Cleanup test data first, then close module
    if (db?.db) {
      await db.db.delete(stockUnits).where(eq(stockUnits.productId, productId)).catch(() => {});
      await db.db.delete(products).where(eq(products.id, productId)).catch(() => {});
      await db.db.delete(users).where(eq(users.id, buyerId)).catch(() => {});
    }
    await db.onModuleDestroy().catch(() => {});
    await module.close();
  });

  // Test data
  let buyerId: string = '';
  let productId: string = '';

  beforeAll(async () => {
    // Create test buyer
    const [buyer] = await db.db
      .insert(users)
      .values({
        email: `spec_orders_buyer_${Date.now()}@nodeline.test`,
        passwordHash: 'argon2-placeholder',
        name: 'Orders Spec Buyer',
        role: 'user',
      })
      .returning({ id: users.id });
    buyerId = buyer.id;

    // Create test product
    const [prod] = await db.db
      .insert(products)
      .values({
        sellerId: buyerId,
        name: 'Orders Spec Product',
        priceCents: 100000,
        keysPerUnit: 1,
        isActive: true,
      })
      .returning({ id: products.id });
    productId = prod.id;

    // Add available stock unit
    const crypto = module.get(StockCryptoUtil);
    const encrypted = crypto.encryptContent('test-key-123');
    await db.db.insert(stockUnits).values({
      productId,
      encryptedContent: encrypted,
      status: 'AVAILABLE',
    });
  });

  describe('checkout', () => {
    it('creates an order with valid items', async () => {
      const order = await service.checkout(buyerId, {
        whatsappNumber: '08123456789',
        items: [{ productId, quantity: 1 }],
      });

      expect(order).toBeDefined();
      expect(order.buyerId).toBe(buyerId);
      expect(order.totalCents).toBe(100000);
      expect(order.status).toBe('PENDING_PAYMENT_CONFIRMATION');

      // Cleanup
      await db.db.delete(orders).where(eq(orders.id, order.id));
    });

    it('rejects checkout with empty items', async () => {
      await expect(
        service.checkout(buyerId, {
          whatsappNumber: '08123456789',
          items: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects checkout with non-existent product', async () => {
      await expect(
        service.checkout(buyerId, {
          whatsappNumber: '08123456789',
          items: [
            {
              productId: '00000000-0000-0000-0000-000000000000',
              quantity: 1,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOwnOrders', () => {
    it('returns empty array for user with no orders', async () => {
      const result = await service.findOwnOrders(buyerId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findAllOrders', () => {
    it('returns array of all orders (admin view)', async () => {
      const result = await service.findAllOrders();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cancelOrder', () => {
    it('rejects cancellation of non-existent order', async () => {
      await expect(
        service.cancelOrder(
          '00000000-0000-0000-0000-000000000000',
          buyerId,
          'test cancel',
        ),
      ).rejects.toThrow();
    });
  });
});
