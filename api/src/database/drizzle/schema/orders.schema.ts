import {
  pgTable,
  uuid,
  integer,
  varchar,
  pgEnum,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_PAYMENT_CONFIRMATION',
  'PAID_PENDING_FULFILLMENT',
  'FULFILLED',
  'REFUND_REQUESTED',
  'REFUNDED',
  'CANCELLED',
]);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).notNull(),
  status: orderStatusEnum('status')
    .notNull()
    .default('PENDING_PAYMENT_CONFIRMATION'),
  totalCents: integer('total_cents').notNull(),
  // Optional free-text note from buyer (payment proof upload is deferred).
  paymentNote: text('payment_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
