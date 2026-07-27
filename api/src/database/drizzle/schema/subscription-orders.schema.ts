import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';
import { apiServices } from './api-services.schema.js';
import { apiPlans } from './api-plans.schema.js';

export const subscriptionOrderStatusEnum = pgEnum('subscription_order_status', [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
]);

export const subscriptionOrders = pgTable('subscription_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => apiServices.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => apiPlans.id),
  status: subscriptionOrderStatusEnum('status')
    .notNull()
    .default('PENDING_PAYMENT'),
  totalCents: integer('total_cents').notNull(),
  /** URL of payment proof image (uploaded to R2) */
  paymentProofUrl: varchar('payment_proof_url', { length: 500 }),
  /** Optional note from buyer */
  paymentNote: text('payment_note'),
  /** Reason for cancellation (set by admin) */
  cancellationNote: text('cancellation_note'),
  confirmedAt: timestamp('confirmed_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type SubscriptionOrder = typeof subscriptionOrders.$inferSelect;
export type NewSubscriptionOrder = typeof subscriptionOrders.$inferInsert;
