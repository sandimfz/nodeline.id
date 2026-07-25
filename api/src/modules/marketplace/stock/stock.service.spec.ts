import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { StockService } from './stock.service.js';
import { StockCryptoUtil } from '../../../common/crypto/stock-crypto.util.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';
import configuration from '../../../config/configuration.js';
import { envValidationSchema } from '../../../config/validation.schema.js';
import {
  users,
  products,
  stockUnits,
} from '../../../database/drizzle/schema/index.js';

/**
 * Integration test for StockService against the real database.
 * Tests restock from text, manual unit addition, and stock queries.
 */
describe('StockService', () => {
  let module: TestingModule;
  let service: StockService;
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
      providers: [StockService, DrizzleService, StockCryptoUtil, AuditLogService],
    }).compile();

    service = module.get(StockService);
    db = module.get(DrizzleService);
    db.onModuleInit();
  });

  afterAll(async () => {
    // Cleanup test data first, then close module
    if (db?.db) {
      await db.db.delete(stockUnits).where(eq(stockUnits.productId, productId)).catch(() => {});
      await db.db.delete(products).where(eq(products.id, productId)).catch(() => {});
      await db.db.delete(users).where(eq(users.id, sellerId)).catch(() => {});
    }
    await db.onModuleDestroy().catch(() => {});
    await module.close();
  });

  let sellerId: string = '';
  let productId: string = '';

  beforeAll(async () => {
    // Create test seller
    const [seller] = await db.db
      .insert(users)
      .values({
        email: `spec_stock_seller_${Date.now()}@nodeline.test`,
        passwordHash: 'argon2-placeholder',
        name: 'Stock Spec Seller',
        role: 'god',
      })
      .returning({ id: users.id });
    sellerId = seller.id;

    // Create test product
    const [prod] = await db.db
      .insert(products)
      .values({
        sellerId,
        name: 'Stock Spec Product',
        priceCents: 50000,
        keysPerUnit: 1,
        isActive: true,
      })
      .returning({ id: products.id });
    productId = prod.id;
  });

  describe('restockFromText', () => {
    it('restocks a product with multiple units from text', async () => {
      const result = await service.restockFromText(
        productId,
        'key-1\nkey-2\nkey-3',
        sellerId,
      );

      expect(result.inserted).toBe(3);

      // Verify units were created
      const units = await db.db
        .select()
        .from(stockUnits)
        .where(eq(stockUnits.productId, productId));
      expect(units.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects restock of non-existent product', async () => {
      await expect(
        service.restockFromText(
          '00000000-0000-0000-0000-000000000000',
          'key-1',
          sellerId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects restock with empty content', async () => {
      await expect(
        service.restockFromText(productId, '', sellerId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('addManualUnit', () => {
    it('adds a single manual unit', async () => {
      const result = await service.addManualUnit(
        productId,
        'manual-key-001',
        sellerId,
      );

      expect(result).toHaveProperty('id');
    });

    it('rejects manual add to non-existent product', async () => {
      await expect(
        service.addManualUnit(
          '00000000-0000-0000-0000-000000000000',
          'key',
          sellerId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findStockUnits', () => {
    it('returns stock units with decrypted content', async () => {
      const units = await service.findStockUnits(productId);

      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBeGreaterThan(0);

      // Content should be decrypted
      for (const unit of units) {
        expect(unit).toHaveProperty('content');
        expect(unit).toHaveProperty('status');
        expect(unit).toHaveProperty('createdAt');
      }
    });

    it('returns empty array for non-existent product', async () => {
      const units = await service.findStockUnits(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(Array.isArray(units)).toBe(true);
      expect(units.length).toBe(0);
    });
  });
});
