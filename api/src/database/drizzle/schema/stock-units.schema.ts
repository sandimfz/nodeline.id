import { pgTable, uuid, text, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products.schema.js';

export const stockUnitStatusEnum = pgEnum('stock_unit_status', [
  'AVAILABLE',
  'SOLD',
  'REVOKED',
]);

export const stockUnits = pgTable('stock_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  // Content is AES-256-GCM encrypted before storage. One unit = one
  // deliverable package (1 key, many keys, or a link) per product's keysPerUnit.
  encryptedContent: text('encrypted_content').notNull(),
  status: stockUnitStatusEnum('status').notNull().default('AVAILABLE'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  soldAt: timestamp('sold_at'),
});

export type StockUnit = typeof stockUnits.$inferSelect;
export type NewStockUnit = typeof stockUnits.$inferInsert;
