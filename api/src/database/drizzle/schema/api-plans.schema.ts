import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { apiServices } from './api-services.schema.js';

export const apiPlans = pgTable('api_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => apiServices.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  requestsPerDay: integer('requests_per_day'), // NULL = unlimited
  requestsPerMinute: integer('requests_per_minute').notNull().default(60),
  features: jsonb('features'), // Array of feature strings
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export type ApiPlan = typeof apiPlans.$inferSelect;
export type NewApiPlan = typeof apiPlans.$inferInsert;
