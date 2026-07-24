import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { Tick, Candle } from '../tradingview/tradingview.types.js';

interface CandlesTickEvent {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume?: number;
  timestamp: number;
}

/**
 * Aggregates ticks into OHLC candles per symbol per interval.
 * Emits 'candle.closed' when a candle completes (new tick crosses interval boundary).
 */
@Injectable()
export class CandleBuilderService {
  private readonly logger = new Logger(CandleBuilderService.name);

  /** Active candles being built: key = `${symbol}:${interval}` */
  private readonly activeCandles = new Map<string, Candle>();

  /** Closed candles emitted recently (in-memory, for /candles endpoint without DB). */
  private readonly closedCandles: Candle[] = [];

  // Max closed candles kept in memory
  private readonly maxClosedCandles = 5000;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Listen to real-time ticks from TradingViewSocketService.
   */
  @OnEvent('tradingview.tick')
  handleTick(tick: CandlesTickEvent): void {
    // Convert to Tick format (already compatible)
    const fullTick: Tick = {
      symbol: tick.symbol,
      price: tick.price,
      change: tick.change,
      changePercent: tick.changePercent,
      high: tick.high,
      low: tick.low,
      volume: tick.volume,
      timestamp: tick.timestamp,
    };
    this.processTick(fullTick);
  }

  /**
   * Process an incoming tick and update the active candle for each configured interval.
   */
  processTick(tick: Tick): void {
    for (const interval of ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const) {
      this.updateCandle(tick, interval);
    }
  }

  private updateCandle(tick: Tick, interval: string): void {
    const key = `${tick.symbol}:${interval}`;
    const candleStart = this.getIntervalStart(tick.timestamp, interval);

    const existing = this.activeCandles.get(key);

    // If no candle yet or new interval started, close the old one and start new
    if (!existing || existing.timestamp < candleStart) {
      if (existing) {
        this.closeCandle(existing);
      }

      this.activeCandles.set(key, {
        symbol: tick.symbol,
        interval,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume ?? 0,
        timestamp: candleStart,
      });
      return;
    }

    // Update existing candle
    existing.high = Math.max(existing.high, tick.price);
    existing.low = Math.min(existing.low, tick.price);
    existing.close = tick.price;
    existing.volume += tick.volume ?? 0;
  }

  private closeCandle(candle: Candle): void {
    // Store in closed list (circular buffer)
    this.closedCandles.push(candle);
    if (this.closedCandles.length > this.maxClosedCandles) {
      this.closedCandles.shift();
    }

    // Emit for persistence by CandleRepository
    this.eventEmitter.emit('candle.closed', candle);
  }

  /**
   * Get candles for a symbol and interval.
   * Returns both active (in-progress) and recently closed candles.
   */
  getCandles(
    symbol: string,
    interval: string,
    limit: number = 100,
  ): Candle[] {
    const result: Candle[] = [];

    // Closed candles (most recent first, then reverse)
    const closed = this.closedCandles
      .filter((c) => c.symbol === symbol && c.interval === interval)
      .slice(-limit);

    result.push(...closed);

    // Active candle (if any)
    const active = this.activeCandles.get(`${symbol}:${interval}`);
    if (active) {
      result.push(active);
    }

    return result;
  }

  /** Get the currently active (in-progress) candle. */
  getActiveCandle(symbol: string, interval: string): Candle | undefined {
    return this.activeCandles.get(`${symbol}:${interval}`);
  }

  /**
   * Round a timestamp down to the start of its interval bucket.
   */
  private getIntervalStart(ts: number, interval: string): number {
    const date = new Date(ts);

    switch (interval) {
      case '1m':
        date.setUTCSeconds(0, 0);
        return date.getTime();
      case '5m': {
        const m5 = Math.floor(date.getUTCMinutes() / 5) * 5;
        date.setUTCMinutes(m5, 0, 0);
        return date.getTime();
      }
      case '15m': {
        const m15 = Math.floor(date.getUTCMinutes() / 15) * 15;
        date.setUTCMinutes(m15, 0, 0);
        return date.getTime();
      }
      case '30m': {
        const m30 = Math.floor(date.getUTCMinutes() / 30) * 30;
        date.setUTCMinutes(m30, 0, 0);
        return date.getTime();
      }
      case '1h':
        date.setUTCMinutes(0, 0, 0);
        return date.getTime();
      case '4h': {
        const h4 = Math.floor(date.getUTCHours() / 4) * 4;
        date.setUTCHours(h4, 0, 0, 0);
        return date.getTime();
      }
      case '1d':
        date.setUTCHours(0, 0, 0, 0);
        return date.getTime();
      default:
        return ts;
    }
  }
}
