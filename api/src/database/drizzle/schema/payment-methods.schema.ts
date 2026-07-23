import {
  pgTable,
  uuid,
  varchar,
  pgEnum,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

export const paymentMethodTypeEnum = pgEnum('payment_method_type', [
  'bank_transfer',
  'qris',
]);

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: paymentMethodTypeEnum('type').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }),
  accountName: varchar('account_name', { length: 200 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
