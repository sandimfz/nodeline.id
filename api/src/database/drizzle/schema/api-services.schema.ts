import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const apiServicePricingTypeEnum = pgEnum('api_service_pricing_type', [
  'FREE',
  'FREEMIUM',
  'PAID',
]);

export const apiServiceStatusEnum = pgEnum('api_service_status', [
  'ACTIVE',
  'MAINTENANCE',
  'DEPRECATED',
]);

export const apiServices = pgTable('api_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 300 }),
  category: varchar('category', { length: 50 }).notNull(),
  baseUrl: varchar('base_url', { length: 500 }).notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  pricingType: apiServicePricingTypeEnum('pricing_type').notNull().default('FREE'),
  status: apiServiceStatusEnum('status').notNull().default('ACTIVE'),
  version: varchar('version', { length: 20 }).notNull().default('v1'),
  isPublished: boolean('is_published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ApiService = typeof apiServices.$inferSelect;
export type NewApiService = typeof apiServices.$inferInsert;
