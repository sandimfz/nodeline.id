import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';
import { categories } from './categories.schema.js';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  keysPerUnit: integer('keys_per_unit').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  // Warranty fields — when set, buyers may claim within the period (ditunda).
  warrantyPeriodDays: integer('warranty_period_days'),
  maxWarrantyClaims: integer('max_warranty_claims'),
  // Images are deferred; we keep a single optional URL field for now.
  imageUrl: varchar('image_url', { length: 500 }),
  // Category
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
