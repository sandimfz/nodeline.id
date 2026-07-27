import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import type { Candle } from '../tradingview/tradingview.types.js';

/**
 * Persists closed candles to Postgres for historical queries.
 * Listens to 'candle.closed' events emitted by CandleBuilderService.
 *
 * Uses raw SQL via drizzle-orm's sql template literal for dynamic table operations.
 */
@Injectable()
export class CandleRepository {
  private readonly logger = new Logger(CandleRepository.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Handle candle closed event — persist to database.
   */
  @OnEvent('candle.closed')
  async saveCandle(candle: Candle): Promise<void> {
    try {
      await this.drizzle.db.execute(
        sql`
          INSERT INTO "candles" (symbol, "interval", open, high, low, "close", volume, "timestamp")
          VALUES (${candle.symbol}, ${candle.interval}, ${candle.open.toFixed(2)}, ${candle.high.toFixed(2)}, ${candle.low.toFixed(2)}, ${candle.close.toFixed(2)}, ${Math.round(candle.volume)}, to_timestamp(${candle.timestamp}::double precision / 1000))
          ON CONFLICT (symbol, "interval", "timestamp") DO UPDATE SET
            high = GREATEST("candles".high, ${candle.high.toFixed(2)}),
            low = LEAST("candles".low, ${candle.low.toFixed(2)}),
            "close" = ${candle.close.toFixed(2)},
            volume = ${Math.round(candle.volume)}
        `,
      );
    } catch (err) {
      this.logger.error(
        `Failed to persist candle for ${candle.symbol}@${candle.interval}:`,
        err,
      );
    }
  }

  /**
   * Query historical candles from the database.
   */
  async queryCandles(
    symbol: string,
    interval: string,
    limit: number = 100,
  ): Promise<Candle[]> {
    try {
      const result = await this.drizzle.db.execute(
        sql`
          SELECT symbol, "interval", open, high, low, "close", volume,
                 EXTRACT(EPOCH FROM "timestamp")::bigint * 1000 as timestamp_ms
          FROM "candles"
          WHERE symbol = ${symbol} AND "interval" = ${interval}
          ORDER BY "timestamp" DESC
          LIMIT ${limit}
        `,
      );

      return (result.rows ?? []).map((row: Record<string, unknown>) => ({
        symbol: String(row.symbol),
        interval: String(row.interval),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
        timestamp: Number(row.timestamp_ms),
      }));
    } catch (err) {
      this.logger.error(`Failed to query candles for ${symbol}:`, err);
      return [];
    }
  }
}
