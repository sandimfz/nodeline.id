import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { orders, orderItems } from '../../../database/drizzle/schema/index.js';
import { StockService } from '../stock/stock.service.js';
import { AuditLogService } from '../audit-logs/audit-logs.service.js';
import { ManualPaymentProvider } from './providers/manual-payment.provider.js';
import type { PaymentProvider } from './providers/payment-provider.interface.js';

/**
 * Payment confirmation. The order stays PENDING_PAYMENT_CONFIRMATION until an
 * admin confirms; only THEN are StockUnits assigned (FIFO auto-assign), and the
 * order flips to FULFILLED only if every item got a unit. Otherwise it stays
 * PAID_PENDING_FULFILLMENT and auto-fills when stock arrives.
 */
@Injectable()
export class PaymentsService {
  // Provider is swappable; default to manual confirmation.
  private readonly provider: PaymentProvider = new ManualPaymentProvider();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly stock: StockService,
    private readonly audit: AuditLogService,
  ) {}

  async confirmPayment(
    orderId: string,
    actorId: string,
  ): Promise<{
    status: string;
  }> {
    const ok = await this.provider.confirm(orderId);
    if (!ok.confirmed) {
      throw new BadRequestException('Pembayaran tidak dapat dikonfirmasi');
    }

    return this.drizzle.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (!order) throw new NotFoundException('Order tidak ditemukan');
      if (order.status !== 'PENDING_PAYMENT_CONFIRMATION') {
        throw new BadRequestException(
          `Order sudah dalam status ${order.status}, tidak bisa dikonfirmasi`,
        );
      }

      // Mark paid; assignment happens next.
      await tx
        .update(orders)
        .set({
          status: 'PAID_PENDING_FULFILLMENT' as const,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      let allFulfilled = true;
      for (const item of items) {
        const unit = await this.stock.assignAvailableUnit(item.id, tx);
        if (!unit) {
          allFulfilled = false;
          break;
        }
      }

      if (allFulfilled) {
        await tx
          .update(orders)
          .set({ status: 'FULFILLED' as const, updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      }

      await this.audit.record(tx, {
        actorId,
        action: 'CONFIRM_PAYMENT',
        entity: 'order',
        entityId: orderId,
        meta: { fullyFulfilled: allFulfilled },
      });

      if (allFulfilled) {
        this.audit.notify(`Order ${orderId} fulfilled`);
      }

      const [final] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      return { status: final.status };
    });
  }
}
