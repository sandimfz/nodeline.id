import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql, isNotNull, desc, asc, ilike } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import {
  products,
  stockUnits,
  orders,
  orderItems,
  users,
  categories,
} from '../../../database/drizzle/schema/index.js';
import type { Product } from '../../../database/drizzle/schema/products.schema.js';

export type StockStatus = 'AVAILABLE' | 'OUT_OF_STOCK';

export interface ProductView extends Product {
  stockStatus: StockStatus;
  stockCount: number;
  categoryName: string | null;
}

export interface CatalogQuery {
  search?: string;
  categoryId?: string;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CatalogResult {
  products: ProductView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Product catalog + admin CRUD. Buyers see only active products, exposed with a
 * coarse stockStatus (AVAILABLE / OUT_OF_STOCK) — never the exact unit count.
 */
@Injectable()
export class ProductsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(
    sellerId: string,
    input: {
      name: string;
      description?: string;
      priceCents: number;
      keysPerUnit: number;
      isActive?: boolean;
      warrantyPeriodDays?: number;
      maxWarrantyClaims?: number;
      imageUrl?: string;
      categoryId?: string;
    },
  ): Promise<Product> {
    const [created] = await this.drizzle.db
      .insert(products)
      .values({
        sellerId,
        name: input.name,
        description: input.description ?? null,
        priceCents: input.priceCents,
        keysPerUnit: input.keysPerUnit,
        isActive: input.isActive ?? true,
        warrantyPeriodDays: input.warrantyPeriodDays ?? null,
        maxWarrantyClaims: input.maxWarrantyClaims ?? null,
        imageUrl: input.imageUrl ?? null,
        categoryId: input.categoryId ?? null,
      })
      .returning();
    return created;
  }

  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      priceCents: number;
      keysPerUnit: number;
      isActive: boolean;
      warrantyPeriodDays: number;
      maxWarrantyClaims: number;
      imageUrl: string;
      categoryId: string | null;
    }>,
  ): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Produk tidak ditemukan');

    const [updated] = await this.drizzle.db
      .update(products)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Produk tidak ditemukan');
    await this.drizzle.db.delete(products).where(eq(products.id, id));
  }

  /**
   * Public catalog: only active products, with pagination, search, category filter, and sorting.
   * Each product tagged with coarse stock status (AVAILABLE / OUT_OF_STOCK).
   */
  async findPublicCatalog(query: CatalogQuery = {}): Promise<CatalogResult> {
    const {
      search,
      categoryId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    // Build WHERE conditions
    const conditions = [eq(products.isActive, true)];

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    // Build ORDER BY
    const orderMap: Record<string, any> = {
      name: sortOrder === 'desc' ? desc(products.name) : asc(products.name),
      price:
        sortOrder === 'desc'
          ? desc(products.priceCents)
          : asc(products.priceCents),
      createdAt:
        sortOrder === 'desc'
          ? desc(products.createdAt)
          : asc(products.createdAt),
    };
    const orderBy = orderMap[sortBy] ?? desc(products.createdAt);
    const offset = (page - 1) * limit;

    // Single round-trip: a window function carries the total count alongside
    // each row, so we don't pay a second DB round-trip just to count.
    const rows = await this.drizzle.db
      .select({
        product: products,
        categoryName: categories.name,
        availableCount: sql<number>`count(case when ${stockUnits.status} = 'AVAILABLE' then 1 end)::int`,
        total: sql<number>`count(*) over()::int`,
      })
      .from(products)
      .leftJoin(
        stockUnits,
        and(eq(stockUnits.productId, products.id), isNotNull(stockUnits.id)),
      )
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(...conditions))
      .groupBy(products.id, categories.name)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // `count(*) over()` counts the grouped rows, which equals the number of
    // matching products. Empty result set means zero matches.
    const total = rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      products: rows.map((r) =>
        this.toView(r.product, r.availableCount ?? 0, r.categoryName ?? null),
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findPublicById(id: string): Promise<ProductView> {
    const [row] = await this.drizzle.db
      .select({
        product: products,
        categoryName: categories.name,
        availableCount: sql<number>`count(case when ${stockUnits.status} = 'AVAILABLE' then 1 end)::int`,
      })
      .from(products)
      .leftJoin(
        stockUnits,
        and(eq(stockUnits.productId, products.id), isNotNull(stockUnits.id)),
      )
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(products.id, id), eq(products.isActive, true)))
      .groupBy(products.id, categories.name);

    if (!row) throw new NotFoundException('Produk tidak ditemukan');
    return this.toView(
      row.product,
      row.availableCount ?? 0,
      row.categoryName ?? null,
    );
  }

  async findById(id: string): Promise<Product | undefined> {
    const [row] = await this.drizzle.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return row;
  }

  /**
   * List pending orders (PENDING_PAYMENT_CONFIRMATION or
   * PAID_PENDING_FULFILLMENT) that contain this product.
   * Grouped by order so each order appears once with aggregated quantity,
   * and includes buyer name/email for admin convenience.
   */
  async findPendingOrders(productId: string) {
    const existing = await this.findById(productId);
    if (!existing) throw new NotFoundException('Produk tidak ditemukan');

    return this.drizzle.db
      .select({
        orderId: orders.id,
        buyerId: orders.buyerId,
        buyerName: users.name,
        buyerEmail: users.email,
        status: orders.status,
        totalCents: orders.totalCents,
        whatsappNumber: orders.whatsappNumber,
        paymentNote: orders.paymentNote,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(
        and(
          eq(orderItems.productId, productId),
          sql`${orders.status} IN ('PENDING_PAYMENT_CONFIRMATION', 'PAID_PENDING_FULFILLMENT')`,
        ),
      )
      .groupBy(orders.id, users.name, users.email)
      .orderBy(desc(orders.createdAt));
  }

  private toView(
    product: Product,
    availableCount: number,
    categoryName: string | null,
  ): ProductView {
    return {
      ...product,
      stockStatus: availableCount > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
      stockCount: availableCount,
      categoryName,
    };
  }
}
