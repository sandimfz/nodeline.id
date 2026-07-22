import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import {
  stockUnits,
  orderItems,
  fulfillments,
  orders,
} from '../../../database/drizzle/schema/index.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../database/drizzle/schema/index.js';
import { StockCryptoUtil } from '../../../common/crypto/stock-crypto.util.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';

type DbOrTx = NodePgDatabase<typeof schema>;

@Injectable()
export class StockService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly crypto: StockCryptoUtil,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Restock a product from a pasted .txt body.
   * Lines are chunked by product.keysPerUnit into individual StockUnits.
   */
  async restockFromText(
    productId: string,
    rawText: string,
    actorId: string,
  ): Promise<{ inserted: number }> {
    const product = await this.drizzle.db.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new BadRequestException('Konten restock kosong');
    }
    if (lines.length % product.keysPerUnit !== 0) {
      throw new BadRequestException(
        `Jumlah baris (${lines.length}) harus kelipatan keysPerUnit produk ini (${product.keysPerUnit})`,
      );
    }

    const units: { productId: string; encryptedContent: string }[] = [];
    for (let i = 0; i < lines.length; i += product.keysPerUnit) {
      const chunk = lines.slice(i, i + product.keysPerUnit).join('\n');
      units.push({
        productId,
        encryptedContent: this.crypto.encryptContent(chunk),
      });
    }

    await this.drizzle.db.insert(stockUnits).values(
      units.map((u) => ({
        productId: u.productId,
        encryptedContent: u.encryptedContent,
        status: 'AVAILABLE' as const,
      })),
    );

    await this.audit.record(null, {
      actorId,
      action: 'RESTOCK',
      entity: 'product',
      entityId: productId,
      meta: { count: units.length, keysPerUnit: product.keysPerUnit },
    });

    // Best-effort fulfillment of any pending orders now that stock arrived.
    await this.tryAutoFulfillPendingOrders(productId);

    return { inserted: units.length };
  }

  /** Add a single unit by hand (custom link / one-off content). */
  async addManualUnit(
    productId: string,
    plainContent: string,
    actorId: string,
  ): Promise<{ id: string }> {
    const product = await this.drizzle.db.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    const [created] = await this.drizzle.db
      .insert(stockUnits)
      .values({
        productId,
        encryptedContent: this.crypto.encryptContent(plainContent),
        status: 'AVAILABLE' as const,
      })
      .returning({ id: stockUnits.id });

    await this.audit.record(null, {
      actorId,
      action: 'ADD_UNIT',
      entity: 'product',
      entityId: productId,
    });

    return { id: created.id };
  }

  /**
   * Atomically claim one AVAILABLE unit for an order item inside a transaction.
   * `FOR UPDATE SKIP LOCKED` prevents two concurrent requests from grabbing
   * the same row — the loser skips to the next available unit instead of
   * blocking or deadlocking.
   *
   * Returns the claimed unit (with decrypted content) or null if the pool is
   * empty (caller leaves the order PAID_PENDING_FULFILLMENT).
   */
  async assignAvailableUnit(
    orderItemId: string,
    tx: DbOrTx,
  ): Promise<{ id: string; content: string } | null> {
    const item = await tx.query.orderItems.findFirst({
      where: eq(orderItems.id, orderItemId),
    });
    if (!item) return null;

    const result = await tx.execute(sql`
      SELECT * FROM stock_units
      WHERE product_id = ${item.productId}
        AND status = 'AVAILABLE'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    const unit = (
      result.rows as Array<{
        id: string;
        encrypted_content: string;
      }>
    )[0];
    if (!unit) return null;

    await tx
      .update(stockUnits)
      .set({ status: 'SOLD', soldAt: new Date() })
      .where(eq(stockUnits.id, unit.id));

    await tx.insert(fulfillments).values({
      orderItemId,
      stockUnitId: unit.id,
      assignedBy: null, // auto-assign
    });

    return {
      id: unit.id,
      content: this.crypto.decryptContent(unit.encrypted_content),
    };
  }

  /**
   * Manual override: admin picks a specific unit for a specific order item.
   * Security: Hanya bisa untuk order yang sudah dikonfirmasi payment (PAID_PENDING_FULFILLMENT).
   * Tidak boleh untuk order yang masih PENDING_PAYMENT_CONFIRMATION — admin wajib konfirmasi payment dulu.
   */
  async manualAssign(
    orderItemId: string,
    stockUnitId: string,
    actorId: string,
    tx: DbOrTx | null,
  ): Promise<void> {
    const db: DbOrTx = tx ?? this.drizzle.db;

    const item = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, orderItemId),
    });
    if (!item) throw new NotFoundException('Order item tidak ditemukan');

    // ⛔ Validasi: order harus sudah dibayar (PAID_PENDING_FULFILLMENT)
    // Admin wajib konfirmasi payment DULU baru bisa assign stock.
    const [order] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, item.orderId))
      .limit(1);
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.status !== 'PAID_PENDING_FULFILLMENT') {
      throw new BadRequestException(
        'Stock hanya bisa di-assign untuk order yang sudah dikonfirmasi pembayaran. Konfirmasi payment dulu.',
      );
    }

    const [unit] = await db
      .select()
      .from(stockUnits)
      .where(eq(stockUnits.id, stockUnitId))
      .limit(1);
    if (!unit) throw new NotFoundException('Stock unit tidak ditemukan');
    if (unit.productId !== item.productId) {
      throw new BadRequestException(
        'Stock unit bukan milik produk order item ini',
      );
    }
    if (unit.status !== 'AVAILABLE') {
      throw new BadRequestException('Stock unit sudah tidak tersedia');
    }

    await db
      .update(stockUnits)
      .set({ status: 'SOLD', soldAt: new Date() })
      .where(eq(stockUnits.id, stockUnitId));

    await db.insert(fulfillments).values({
      orderItemId,
      stockUnitId,
      assignedBy: actorId,
    });

    await this.audit.record(tx, {
      actorId,
      action: 'MANUAL_ASSIGN',
      entity: 'order_item',
      entityId: orderItemId,
      meta: { stockUnitId },
    });
  }

  /**
   * List all stock units for a product, with decrypted content for admin view.
   */
  async findStockUnits(productId: string): Promise<
    Array<{
      id: string;
      content: string;
      status: string;
      createdAt: Date;
      soldAt: Date | null;
    }>
  > {
    const rows = await this.drizzle.db
      .select()
      .from(stockUnits)
      .where(eq(stockUnits.productId, productId))
      .orderBy(stockUnits.createdAt);

    return rows.map((u) => ({
      id: u.id,
      content: this.crypto.decryptContent(u.encryptedContent),
      status: u.status,
      createdAt: u.createdAt,
      soldAt: u.soldAt,
    }));
  }

  /**
   * After a restock, try to fulfill any PAID_PENDING_FULFILLMENT orders that
   * contain this product, FIFO. Runs inside its own transaction per order.
   */
  async tryAutoFulfillPendingOrders(productId: string): Promise<void> {
    // Find distinct order ids pending fulfillment that contain this product.
    const pending = await this.drizzle.db
      .selectDistinct({ orderId: orderItems.orderId })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orderItems.productId, productId),
          eq(orders.status, 'PAID_PENDING_FULFILLMENT'),
        ),
      );

    for (const { orderId } of pending) {
      await this.fulfillOrderIfReady(orderId);
    }
  }

  /**
   * Assign units for every item in an order; mark FULFILLED if all got one.
   * If any item cannot be filled, the whole transaction rolls back so we never
   * partially assign (and never mark FULFILLED with missing units).
   */
  async fulfillOrderIfReady(orderId: string): Promise<boolean> {
    return this.drizzle
      .transaction(async (tx) => {
        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId));

        for (const item of items) {
          const unit = await this.assignAvailableUnit(item.id, tx);
          if (!unit) {
            // Pool empty for this item — abort the transaction, leave order as is.
            throw new Error('INSUFFICIENT_STOCK');
          }
        }

        await tx
          .update(orders)
          .set({ status: 'FULFILLED' as const, updatedAt: new Date() })
          .where(eq(orders.id, orderId));
        await this.audit.record(tx, {
          action: 'AUTO_FULFILL',
          entity: 'order',
          entityId: orderId,
        });
        this.audit.notify(`Order ${orderId} fulfilled`);
        return true;
      })
      .catch(() => false);
  }
}
