import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { apiKeys } from './api-keys.schema.js';

export const apiUsageLogs = pgTable('api_usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  endpoint: varchar('endpoint', { length: 100 }).notNull(),
  statusCode: integer('status_code').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type NewApiUsageLog = typeof apiUsageLogs.$inferInsert;
