import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const apiKeyPlanEnum = pgEnum('api_key_plan', [
  'FREE',
  'PRO',
  'ENTERPRISE',
]);

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
  hashedKey: varchar('hashed_key', { length: 64 }).notNull(),
  plan: apiKeyPlanEnum('plan').notNull().default('FREE'),
  allowedSymbols: varchar('allowed_symbols', { length: 1000 }),
  rateLimitPerMin: integer('rate_limit_per_min').notNull().default(60),
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
