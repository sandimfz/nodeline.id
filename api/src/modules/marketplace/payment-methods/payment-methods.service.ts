import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { paymentMethods } from '../../../database/drizzle/schema/index.js';
import type { PaymentMethod } from '../../../database/drizzle/schema/payment-methods.schema.js';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import type { UpdatePaymentMethodDto } from './dto/update-payment-method.dto.js';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Admin: create a new payment method */
  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const [created] = await this.drizzle.db
      .insert(paymentMethods)
      .values({
        type: dto.type,
        name: dto.name,
        imageUrl: dto.imageUrl,
        accountNumber: dto.accountNumber ?? null,
        accountName: dto.accountName ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();
    return created;
  }

  /** Public: list active payment methods sorted by sortOrder */
  async findActive(): Promise<PaymentMethod[]> {
    return this.drizzle.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.sortOrder);
  }

  /** Admin: list all payment methods */
  async findAll(): Promise<PaymentMethod[]> {
    return this.drizzle.db
      .select()
      .from(paymentMethods)
      .orderBy(paymentMethods.sortOrder);
  }

  /** Admin: update a payment method */
  async update(
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const [existing] = await this.drizzle.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);
    if (!existing) {
      throw new NotFoundException('Metode pembayaran tidak ditemukan');
    }

    const [updated] = await this.drizzle.db
      .update(paymentMethods)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, id))
      .returning();
    return updated;
  }

  /** Admin: delete a payment method */
  async remove(id: string): Promise<void> {
    const [existing] = await this.drizzle.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);
    if (!existing) {
      throw new NotFoundException('Metode pembayaran tidak ditemukan');
    }

    await this.drizzle.db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id));
  }
}
