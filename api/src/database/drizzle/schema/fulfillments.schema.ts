import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orderItems } from './order-items.schema.js';
import { stockUnits } from './stock-units.schema.js';

export const fulfillments = pgTable('fulfillments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id),
  stockUnitId: uuid('stock_unit_id')
    .notNull()
    .references(() => stockUnits.id),
  isActive: boolean('is_active').notNull().default(true), // false if replaced (warranty, later)
  assignedBy: uuid('assigned_by'), // null = auto-assign; userId when manual
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Fulfillment = typeof fulfillments.$inferSelect;
export type NewFulfillment = typeof fulfillments.$inferInsert;
