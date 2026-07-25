import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { apiServices } from './api-services.schema.js';

export const apiEndpoints = pgTable('api_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => apiServices.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 200 }).notNull(),
  summary: varchar('summary', { length: 300 }),
  description: text('description'),
  requestExample: jsonb('request_example'),
  responseExample: jsonb('response_example'),
  isPremium: boolean('is_premium').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export type ApiEndpoint = typeof apiEndpoints.$inferSelect;
export type NewApiEndpoint = typeof apiEndpoints.$inferInsert;
