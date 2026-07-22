import { pgTable, uuid, varchar, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const conversationStatusEnum = pgEnum('conversation_status', [
  'OPEN',
  'CLOSED',
]);

/**
 * Percakapan antara user dan admin (god).
 * Setiap user idealnya memiliki 1 conversation OPEN.
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  // Admin yang ditugaskan (null sampai admin pertama membalas)
  assignedAdminId: uuid('assigned_admin_id').references(() => users.id),
  status: conversationStatusEnum('status').notNull().default('OPEN'),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
