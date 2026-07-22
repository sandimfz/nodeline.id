import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { conversations } from './conversations.schema.js';
import { users } from './users.schema.js';

/**
 * Pesan dalam percakapan.
 * senderRole diambil dari data user terverifikasi (bukan dari payload client).
 */
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id),
  senderRole: varchar('sender_role', { length: 10 }).notNull().default('user'),
  content: text('content').notNull(),
  // Lampiran (defer — reuse storage endpoint nanti)
  attachmentUrl: varchar('attachment_url', { length: 500 }),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Index untuk pagination: conversationId + createdAt
// Drizzle tidak support partial index definitions di DDL, jadi manual di migrasi nanti.

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
