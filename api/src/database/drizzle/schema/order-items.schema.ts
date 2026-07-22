import { pgTable, uuid, integer } from 'drizzle-orm/pg-core';
import { orders } from './orders.schema.js';
import { products } from './products.schema.js';

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  priceCents: integer('price_cents').notNull(), // snapshot of price at purchase
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
