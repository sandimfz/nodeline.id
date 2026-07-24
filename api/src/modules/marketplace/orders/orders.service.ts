import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import {
  orders,
  orderItems,
  fulfillments,
  stockUnits,
  products,
  users,
} from '../../../database/drizzle/schema/index.js';
import type { Order } from '../../../database/drizzle/schema/orders.schema.js';
import { StockCryptoUtil } from '../../../common/crypto/stock-crypto.util.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';
import { ChatService } from '../../chat/chat.service.js';
import { ChatGateway } from '../../chat/chat.gateway.js';

interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface OrderView extends Omit<Order, never> {
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    priceCents: number;
    hasContent: boolean;
  }>;
}

/**
 * Checkout + order history + content delivery.
 * Security: content is only ever decrypted after an ownership check on the
 * ORDER (order.buyerId === user.id) AND confirmation that the requested item
 * belongs to that order — this is what prevents IDOR on the content endpoint.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly crypto: StockCryptoUtil,
    private readonly audit: AuditLogService,
    private readonly chat: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Cancel an order by admin.
   * - PENDING_PAYMENT_CONFIRMATION / PAID_PENDING_FULFILLMENT → CANCELLED (no stock to release)
   * - FULFILLED → REFUNDED (stock units released back to AVAILABLE, fulfillments deactivated)
   *
   * If a reason is provided, sends a message to the buyer's chat conversation
   * explaining why the order was cancelled before performing the cancellation.
   */
  async cancelOrder(
    orderId: string,
    actorId: string,
    reason?: string,
  ): Promise<{ status: string; reason?: string }> {
    // Look up the order first to validate and get buyerId
    const [order] = await this.drizzle.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('Order sudah di-cancel/refund sebelumnya');
    }

    // If reason is provided, send a message to the buyer via chat
    // before performing the cancellation so the buyer gets notified
    if (reason) {
      const actionType = order.status === 'FULFILLED' ? 'refund' : 'cancel';
      await this.sendCancelMessage(
        order.buyerId,
        actorId,
        reason,
        actionType,
        order.id,
      );
    }

    return this.drizzle.transaction(async (tx) => {

      if (order.status === 'FULFILLED') {
        // Release all stock units back to AVAILABLE
        const fulfills = await tx
          .select({ id: fulfillments.id, stockUnitId: fulfillments.stockUnitId })
          .from(fulfillments)
          .innerJoin(orderItems, eq(orderItems.id, fulfillments.orderItemId))
          .where(
            and(
              eq(orderItems.orderId, orderId),
              eq(fulfillments.isActive, true),
            ),
          );

        for (const f of fulfills) {
          await tx
            .update(fulfillments)
            .set({ isActive: false })
            .where(eq(fulfillments.id, f.id));

          await tx
            .update(stockUnits)
            .set({ status: 'AVAILABLE', soldAt: null })
            .where(eq(stockUnits.id, f.stockUnitId));
        }

        await tx
          .update(orders)
          .set({ status: 'REFUNDED', updatedAt: new Date(), cancellationNote: reason ?? null })
          .where(eq(orders.id, orderId));

        await this.audit.record(tx, {
          actorId,
          action: 'REFUND',
          entity: 'order',
          entityId: orderId,
          meta: { reason },
        });

        return { status: 'REFUNDED', reason };
      }

      // PENDING_PAYMENT_CONFIRMATION or PAID_PENDING_FULFILLMENT
      await tx
        .update(orders)
        .set({ status: 'CANCELLED', updatedAt: new Date(), cancellationNote: reason ?? null })
        .where(eq(orders.id, orderId));

      await this.audit.record(tx, {
        actorId,
        action: 'CANCEL',
        entity: 'order',
        entityId: orderId,
        meta: { previousStatus: order.status, reason },
      });

      return { status: 'CANCELLED', reason };
    });
  }

  /**
   * Send a cancellation/refund reason message to the buyer via chat.
   * Finds or creates an open conversation, saves the message, and broadcasts it.
   */
  private async sendCancelMessage(
    buyerId: string,
    actorId: string,
    reason: string,
    type: 'cancel' | 'refund',
    orderId: string,
  ): Promise<void> {
    try {
      const conversation = await this.chat.getOrCreateConversation(buyerId);

      const label = type === 'refund' ? 'Pesanan Di-Refund' : 'Pesanan Dibatalkan';
      const shortId = orderId.slice(0, 8);

      const message = await this.chat.saveMessage({
        conversationId: conversation.id,
        senderId: actorId,
        senderRole: 'god',
        content: `[${label}] #${shortId}\n\n${reason}`,
      });

      await this.chatGateway.broadcastNewMessage(conversation.id, {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        attachmentUrl: message.attachmentUrl,
        readAt: message.readAt,
        createdAt: message.createdAt,
      });
    } catch (err) {
      // Jangan sampai gagal kirim pesan menggagalkan cancel order
      console.error(
        `[Orders] Gagal kirim pesan cancel ke buyer ${buyerId}:`,
        err,
      );
    }
  }

  /**
   * Create an order. No stock is touched here — units are only assigned after
   * an admin confirms payment (see PaymentsService.confirmPayment).
   */
  async checkout(
    buyerId: string,
    input: {
      whatsappNumber: string;
      items: CheckoutItem[];
      paymentNote?: string;
    },
  ): Promise<Order> {
    if (input.items.length === 0) {
      throw new BadRequestException('Order harus punya minimal 1 item');
    }

    // Validate products exist + are active, and snapshot their prices.
    let totalCents = 0;
    const itemSnapshots: Array<{
      productId: string;
      quantity: number;
      priceCents: number;
    }> = [];

    for (const item of input.items) {
      const [product] = await this.drizzle.db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      if (!product) {
        throw new NotFoundException(`Produk ${item.productId} tidak ditemukan`);
      }
      if (!product.isActive) {
        throw new BadRequestException(
          `Produk ${product.name} sedang tidak tersedia`,
        );
      }

      // Check stock availability — tolak jika stok habis.
      const [stockCount] = await this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(stockUnits)
        .where(
          and(
            eq(stockUnits.productId, item.productId),
            eq(stockUnits.status, 'AVAILABLE'),
          ),
        );
      const availableCount = stockCount?.count ?? 0;
      if (availableCount < item.quantity) {
        throw new BadRequestException(
          `Stok produk ${product.name} tidak mencukupi. Tersedia: ${availableCount}, diminta: ${item.quantity}`,
        );
      }

      totalCents += product.priceCents * item.quantity;
      itemSnapshots.push({
        productId: product.id,
        quantity: item.quantity,
        priceCents: product.priceCents,
      });
    }

    return this.drizzle.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          buyerId,
          whatsappNumber: input.whatsappNumber,
          status: 'PENDING_PAYMENT_CONFIRMATION' as const,
          totalCents,
          paymentNote: input.paymentNote ?? null,
        })
        .returning();

      await tx.insert(orderItems).values(
        itemSnapshots.map((s) => ({
          orderId: order.id,
          productId: s.productId,
          quantity: s.quantity,
          priceCents: s.priceCents,
        })),
      );

      return order;
    });
  }

  async findOwnOrders(buyerId: string): Promise<Order[]> {
    return this.drizzle.db
      .select()
      .from(orders)
      .where(eq(orders.buyerId, buyerId))
      .orderBy(desc(orders.createdAt));
  }

  /** Own order detail with items + per-item content-availability flag. */
  async findOwnOrderById(buyerId: string, orderId: string): Promise<OrderView> {
    const order = await this.requireOwnedOrder(buyerId, orderId);

    const items = await this.drizzle.db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        priceCents: orderItems.priceCents,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, orderId));

    const view: OrderView = {
      ...order,
      items: items.map((it) => ({
        ...it,
        hasContent: false, // populated below
      })),
    };

    // Mark which items already have an active fulfillment (content available).
    for (const it of view.items) {
      const [active] = await this.drizzle.db
        .select({ id: fulfillments.id })
        .from(fulfillments)
        .where(
          and(
            eq(fulfillments.orderItemId, it.id),
            eq(fulfillments.isActive, true),
          ),
        )
        .limit(1);
      it.hasContent = Boolean(active);
    }

    return view;
  }

  /**
   * Decrypt and return the delivered content for one order item.
   * Anti-IDOR: order must belong to the caller AND the item must belong to it.
   */
  async getDecryptedContentForItem(
    buyerId: string,
    orderId: string,
    orderItemId: string,
  ): Promise<{ content: string }> {
    // 1) Ownership of the ORDER itself.
    await this.requireOwnedOrder(buyerId, orderId);

    // 2) The item must belong to that order.
    const [item] = await this.drizzle.db
      .select()
      .from(orderItems)
      .where(
        and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId)),
      )
      .limit(1);
    if (!item) {
      throw new NotFoundException('Order item tidak ditemukan');
    }

    // 3) An active fulfillment must exist for this item.
    const [ful] = await this.drizzle.db
      .select({ stockUnitId: fulfillments.stockUnitId })
      .from(fulfillments)
      .where(
        and(
          eq(fulfillments.orderItemId, orderItemId),
          eq(fulfillments.isActive, true),
        ),
      )
      .limit(1);
    if (!ful) {
      throw new NotFoundException('Konten belum tersedia untuk item ini');
    }

    const [unit] = await this.drizzle.db
      .select()
      .from(stockUnits)
      .where(eq(stockUnits.id, ful.stockUnitId))
      .limit(1);
    if (!unit) {
      throw new NotFoundException('Stock unit tidak ditemukan');
    }

    return { content: this.crypto.decryptContent(unit.encryptedContent) };
  }

  async setPaymentNote(
    buyerId: string,
    orderId: string,
    note: string,
  ): Promise<Order> {
    const order = await this.requireOwnedOrder(buyerId, orderId);
    if (order.status !== 'PENDING_PAYMENT_CONFIRMATION') {
      throw new BadRequestException(
        'Catatan pembayaran hanya bisa diubah sebelum dikonfirmasi',
      );
    }
    const [updated] = await this.drizzle.db
      .update(orders)
      .set({ paymentNote: note, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  /**
   * List ALL orders with buyer info (admin only).
   */
  async findAllOrders(): Promise<
    Array<{
      id: string;
      buyerId: string;
      buyerName: string;
      buyerEmail: string;
      status: string;
      totalCents: number;
      whatsappNumber: string;
      paymentNote: string | null;
      itemCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return this.drizzle.db
      .select({
        id: orders.id,
        buyerId: orders.buyerId,
        buyerName: users.name,
        buyerEmail: users.email,
        status: orders.status,
        totalCents: orders.totalCents,
        whatsappNumber: orders.whatsappNumber,
        paymentNote: orders.paymentNote,
        itemCount: sql<number>`count(${orderItems.id})::int`,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.buyerId))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .groupBy(orders.id, users.name, users.email)
      .orderBy(desc(orders.createdAt));
  }

  /**
   * Full order detail for admin — bypasses ownership check.
   * Includes items with product names, fulfillment status, and stock unit IDs.
   */
  async findAdminOrderById(orderId: string): Promise<{
    id: string;
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    status: string;
    totalCents: number;
    whatsappNumber: string;
    paymentNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productImage: string | null;
      quantity: number;
      priceCents: number;
      fulfilled: boolean;
      stockUnitIds: string[];
    }>;
  }> {
    const [order] = await this.drizzle.db
      .select({
        id: orders.id,
        buyerId: orders.buyerId,
        buyerName: users.name,
        buyerEmail: users.email,
        status: orders.status,
        totalCents: orders.totalCents,
        whatsappNumber: orders.whatsappNumber,
        paymentNote: orders.paymentNote,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    const items = await this.drizzle.db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        productImage: products.imageUrl,
        quantity: orderItems.quantity,
        priceCents: orderItems.priceCents,
        fulfillmentId: fulfillments.id,
        stockUnitId: fulfillments.stockUnitId,
        isActive: fulfillments.isActive,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(fulfillments, eq(fulfillments.orderItemId, orderItems.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.id);

    // Group items, collect stock unit IDs per item
    const itemMap = new Map<
      string,
      {
        id: string;
        productId: string;
        productName: string;
        productImage: string | null;
        quantity: number;
        priceCents: number;
        fulfilled: boolean;
        stockUnitIds: string[];
      }
    >();

    for (const row of items) {
      if (!itemMap.has(row.id)) {
        itemMap.set(row.id, {
          id: row.id,
          productId: row.productId,
          productName: row.productName,
          productImage: row.productImage,
          quantity: row.quantity,
          priceCents: row.priceCents,
          fulfilled: false,
          stockUnitIds: [],
        });
      }
      const entry = itemMap.get(row.id)!;
      if (row.fulfillmentId && row.isActive) {
        entry.fulfilled = true;
        if (row.stockUnitId) {
          entry.stockUnitIds.push(row.stockUnitId);
        }
      }
    }

    return {
      ...order,
      items: Array.from(itemMap.values()),
    };
  }

  // ---- helpers ----

  private async requireOwnedOrder(
    buyerId: string,
    orderId: string,
  ): Promise<Order> {
    const [order] = await this.drizzle.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }
    // Ownership check — never just trust the order id.
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
    }
    return order;
  }
}
