import {
  pgTable,
  varchar,
  doublePrecision,
  bigint,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Candle (OHLC) data aggregated from real-time ticks.
 * One row per symbol + interval + timestamp combination.
 * The `timestamp` column stores the candle start time (rounded down to interval boundary).
 * The `closed_at` timestamp indicates when the candle was finalized in the database.
 */
export const candles = pgTable('candles', {
  symbol: varchar('symbol', { length: 50 }).notNull(),
  interval: varchar('interval', { length: 5 }).notNull(),
  open: doublePrecision('open').notNull(),
  high: doublePrecision('high').notNull(),
  low: doublePrecision('low').notNull(),
  close: doublePrecision('close').notNull(),
  volume: doublePrecision('volume').notNull().default(0),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  // Composite primary key ensures upsert by CandleRepository works
  primaryKey: { columns: [table.symbol, table.interval, table.timestamp] },
}));

export type Candle = typeof candles.$inferSelect;
export type NewCandle = typeof candles.$inferInsert;
