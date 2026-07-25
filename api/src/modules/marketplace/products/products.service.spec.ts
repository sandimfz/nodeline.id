import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { ProductsService } from './products.service.js';
import { StockCryptoUtil } from '../../../common/crypto/stock-crypto.util.js';
import configuration from '../../../config/configuration.js';
import { envValidationSchema } from '../../../config/validation.schema.js';
import { users, products } from '../../../database/drizzle/schema/index.js';

/**
 * Integration test against the real database (nodeline_api) for the core
 * product flow: creating products with warranty fields, and the new
 * findPendingOrders endpoint.
 */
describe('ProductsService (marketplace)', () => {
  let module: TestingModule;
  let service: ProductsService;
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
      providers: [ProductsService, DrizzleService, StockCryptoUtil],
    }).compile();

    service = module.get(ProductsService);
    db = module.get(DrizzleService);
    db.onModuleInit();
  });

  afterAll(async () => {
    // Clean up test data
    if (db.db) {
      // Products cascade to stock_units, so deleting products is enough.
      await db.db
        .delete(products)
        .where(eq(products.name, 'Warranty Test Product'));
      // Also clean the god user used in tests
      await db.db
        .delete(users)
        .where(eq(users.email, 'spec_warranty_god@nodeline.test'));
    }
    await db.onModuleDestroy();
    await module.close();
  });

  // Seed: create a god user to act as seller
  let sellerId: string;

  beforeAll(async () => {
    // Insert a test god user if not exists
    const [existing] = await db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'spec_warranty_god@nodeline.test'))
      .limit(1);

    if (existing) {
      sellerId = existing.id;
    } else {
      const [created] = await db.db
        .insert(users)
        .values({
          email: 'spec_warranty_god@nodeline.test',
          passwordHash: 'argon2-placeholder-no-one-will-match',
          name: 'Spec God',
          role: 'god',
        })
        .returning({ id: users.id });
      sellerId = created.id;
    }
  });

  describe('create product with warranty fields', () => {
    it('creates a product with warrantyPeriodDays and maxWarrantyClaims', async () => {
      const product = await service.create(sellerId, {
        name: 'Warranty Test Product',
        description: 'Testing warranty fields',
        priceCents: 75000,
        keysPerUnit: 1,
        isActive: true,
        warrantyPeriodDays: 30,
        maxWarrantyClaims: 2,
      });

      expect(product.name).toBe('Warranty Test Product');
      expect(product.warrantyPeriodDays).toBe(30);
      expect(product.maxWarrantyClaims).toBe(2);
      expect(product.priceCents).toBe(75000);
    });

    it('creates a product without warranty fields (null defaults)', async () => {
      const product = await service.create(sellerId, {
        name: 'Warranty Test Product',
        priceCents: 50000,
        keysPerUnit: 1,
      });

      expect(product.warrantyPeriodDays).toBeNull();
      expect(product.maxWarrantyClaims).toBeNull();
    });
  });

  describe('update product warranty fields', () => {
    let prodId: string;

    beforeAll(async () => {
      const p = await service.create(sellerId, {
        name: 'Warranty Test Product',
        priceCents: 50000,
        keysPerUnit: 1,
      });
      prodId = p.id;
    });

    it('updates warrantyPeriodDays', async () => {
      const updated = await service.update(prodId, {
        warrantyPeriodDays: 60,
      });
      expect(updated.warrantyPeriodDays).toBe(60);
    });

    it('updates maxWarrantyClaims', async () => {
      const updated = await service.update(prodId, {
        maxWarrantyClaims: 3,
      });
      expect(updated.maxWarrantyClaims).toBe(3);
    });
  });

  describe('findPendingOrders', () => {
    it('returns empty array when no pending orders exist', async () => {
      // Just-created products should have no pending orders.
      const product = await service.create(sellerId, {
        name: 'Warranty Test Product',
        priceCents: 50000,
        keysPerUnit: 1,
      });
      const result = await service.findPendingOrders(product.id);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('throws 404 for non-existent product', async () => {
      await expect(
        service.findPendingOrders('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findPublicCatalog with pagination & search', () => {
    it('returns paginated catalog result with products, total, page info', async () => {
      const result = await service.findPublicCatalog({ page: 1, limit: 10 });

      expect(result).toHaveProperty('products');
      expect(Array.isArray(result.products)).toBe(true);
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('totalPages');
      expect(typeof result.totalPages).toBe('number');
    });

    it('returns empty products when search term does not match', async () => {
      const result = await service.findPublicCatalog({
        search: 'zzz_nonexistent_zzz',
      });

      expect(result.products.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1); // at least 1 page
    });

    it('filters by categoryId when provided', async () => {
      // Use a random UUID that doesn't exist as a category
      const categoryId = '00000000-0000-0000-0000-000000000000';
      const result = await service.findPublicCatalog({ categoryId });

      expect(result.products.length).toBe(0);
    });

    it('sorts products by name ascending', async () => {
      const result = await service.findPublicCatalog({
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(Array.isArray(result.products)).toBe(true);
    });
  });
});
