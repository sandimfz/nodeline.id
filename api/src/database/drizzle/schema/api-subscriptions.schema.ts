import {
  pgTable,
  uuid,
  integer,
  timestamp,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { apiKeys } from './api-keys.schema.js';
import { apiServices } from './api-services.schema.js';
import { apiPlans } from './api-plans.schema.js';

export const apiSubscriptionStatusEnum = pgEnum('api_subscription_status', [
  'ACTIVE',
  'CANCELLED',
  'SUSPENDED',
]);

export const apiSubscriptions = pgTable(
  'api_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => apiKeys.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => apiServices.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => apiPlans.id),
    status: apiSubscriptionStatusEnum('status').notNull().default('ACTIVE'),
    quotaUsedToday: integer('quota_used_today').notNull().default(0),
    quotaResetAt: timestamp('quota_reset_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    // 1 key can only have 1 active subscription per service
    uniqueKeyService: unique('api_subscriptions_key_service_unique').on(
      table.apiKeyId,
      table.serviceId,
    ),
  }),
);

export type ApiSubscription = typeof apiSubscriptions.$inferSelect;
export type NewApiSubscription = typeof apiSubscriptions.$inferInsert;
