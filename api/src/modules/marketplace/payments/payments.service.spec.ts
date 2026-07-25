import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { PaymentsService } from './payments.service.js';
import { StockService } from '../stock/stock.service.js';
import { StockCryptoUtil } from '../../../common/crypto/stock-crypto.util.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';
import configuration from '../../../config/configuration.js';
import { envValidationSchema } from '../../../config/validation.schema.js';
import {
  users,
  products,
  stockUnits,
  orders,
  orderItems,
} from '../../../database/drizzle/schema/index.js';

/**
 * Integration test for PaymentsService against the real database.
 * Tests payment confirmation and auto-fulfillment flow.
 */
describe('PaymentsService', () => {
  let module: TestingModule;
  let service: PaymentsService;
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
      providers: [
        PaymentsService,
        DrizzleService,
        StockService,
        StockCryptoUtil,
        AuditLogService,
      ],
    }).compile();

    service = module.get(PaymentsService);
    db = module.get(DrizzleService);
    db.onModuleInit();
  });

  afterAll(async () => {
    // Cleanup test data first, then close module
    if (db?.db) {
      await db.db.delete(stockUnits).where(eq(stockUnits.productId, productId)).catch(() => {});
      await db.db.delete(products).where(eq(products.id, productId)).catch(() => {});
      await db.db.delete(users).where(eq(users.id, buyerId)).catch(() => {});
      await db.db.delete(users).where(eq(users.id, adminId)).catch(() => {});
    }
    await db.onModuleDestroy().catch(() => {});
    await module.close();
  });

  let adminId: string = '';
  let buyerId: string = '';
  let productId: string = '';

  beforeAll(async () => {
    // Create test admin
    const [admin] = await db.db
      .insert(users)
      .values({
        email: `spec_payments_admin_${Date.now()}@nodeline.test`,
        passwordHash: 'argon2-placeholder',
        name: 'Payments Spec Admin',
        role: 'god',
      })
      .returning({ id: users.id });
    adminId = admin.id;

    // Create test buyer
    const [buyer] = await db.db
      .insert(users)
      .values({
        email: `spec_payments_buyer_${Date.now()}@nodeline.test`,
        passwordHash: 'argon2-placeholder',
        name: 'Payments Spec Buyer',
        role: 'user',
      })
      .returning({ id: users.id });
    buyerId = buyer.id;

    // Create test product
    const [prod] = await db.db
      .insert(products)
      .values({
        sellerId: adminId,
        name: 'Payments Spec Product',
        priceCents: 75000,
        keysPerUnit: 1,
        isActive: true,
      })
      .returning({ id: products.id });
    productId = prod.id;

    // Add available stock
    const crypto = module.get(StockCryptoUtil);
    const encrypted = crypto.encryptContent('payment-test-key');
    await db.db.insert(stockUnits).values({
      productId,
      encryptedContent: encrypted,
      status: 'AVAILABLE',
    });
  });

  describe('confirmPayment', () => {
    it('rejects confirmation of non-existent order', async () => {
      await expect(
        service.confirmPayment(
          '00000000-0000-0000-0000-000000000000',
          adminId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects confirmation of already fulfilled order', async () => {
      // Create order and immediately fulfill it
      const [order] = await db.db
        .insert(orders)
        .values({
          buyerId,
          whatsappNumber: '08123456789',
          status: 'FULFILLED',
          totalCents: 75000,
        })
        .returning({ id: orders.id });

      await expect(
        service.confirmPayment(order.id, adminId),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Cleanup
      await db.db.delete(orders).where(eq(orders.id, order.id));
    });

    it('confirms payment for a valid pending order with stock', async () => {
      // Create a pending order
      const [order] = await db.db
        .insert(orders)
        .values({
          buyerId,
          whatsappNumber: '08123456789',
          status: 'PENDING_PAYMENT_CONFIRMATION',
          totalCents: 75000,
        })
        .returning({ id: orders.id });

      // Add order item
      await db.db.insert(orderItems).values({
        orderId: order.id,
        productId,
        quantity: 1,
        priceCents: 75000,
      });

      const result = await service.confirmPayment(order.id, adminId);

      expect(result).toHaveProperty('status');
      expect(['FULFILLED', 'PAID_PENDING_FULFILLMENT']).toContain(result.status);

      // Cleanup
      await db.db.delete(orderItems).where(eq(orderItems.orderId, order.id));
      await db.db.delete(orders).where(eq(orders.id, order.id));
    });
  });
});
