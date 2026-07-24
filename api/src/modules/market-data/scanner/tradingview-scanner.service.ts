import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ScannerResult } from '../tradingview/tradingview.types.js';

interface ScannerResponse {
  data?: Array<{
    s: string;       // symbol, e.g. "FX:XAUUSD"
    d?: unknown[];   // data values in order of the columns requested
  }>;
}

/**
 * Fetches technical indicators from TradingView's scanner endpoint.
 * Results are cached with a configurable TTL (default 10s).
 */
@Injectable()
export class TradingViewScannerService {
  private readonly logger = new Logger(TradingViewScannerService.name);
  private readonly scannerUrl: string;
  private readonly cache = new Map<
    string,
    { result: ScannerResult[]; expiresAt: number }
  >();

  constructor(private readonly config: ConfigService) {
    this.scannerUrl = this.config.get<string>('marketData.tradingviewScannerUrl')!;
  }

  /**
   * Get technical indicators for a symbol.
   * @param symbol TradingView symbol (e.g. "FOREXCOM:XAUUSD")
   * @param timeframe Timeframe in minutes (1, 5, 15, 30, 60, 240, 1D)
   */
  async getIndicators(
    symbol: string,
    timeframe: number = 1,
  ): Promise<ScannerResult | null> {
    const cacheKey = `${symbol}:${timeframe}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result[0] ?? null;
    }

    try {
      const tvSymbol = this.toScannerSymbol(symbol);
      const results = await this.scan([tvSymbol], timeframe);
      if (results.length > 0) {
        this.cache.set(cacheKey, {
          result: results,
          expiresAt: Date.now() + 10_000, // 10s TTL
        });
        return results[0];
      }
      return null;
    } catch (err) {
      this.logger.error(`Scanner error for ${symbol}:`, err);
      return null;
    }
  }

  /**
   * Scan multiple symbols at once.
   */
  private async scan(
    symbols: string[],
    timeframe: number,
  ): Promise<ScannerResult[]> {
    const interval = this.timeframeToInterval(timeframe);

    const body = {
      symbols: { tickers: symbols, query: { types: [] } },
      columns: [
        'name',
        'description',
        'close',
        'change',
        'change_abs',
        'Recommend.All',
        'RSI',
        'RSI[1]',
        'Stoch.K',
        'Stoch.D',
        'Mom',
        'Mom[1]',
        'MACD.macd',
        'MACD.signal',
        'EMA5',
        'EMA10',
        'EMA20',
        'SMA20',
        'SMA50',
        'SMA200',
        'BB.upper',
        'BB.lower',
        'ADX',
        'ADX+DI',
        'ADX-DI',
        'AO',
        'AO[1]',
        'ATR',
        'high',
        'low',
      ],
      options: { lang: 'en' },
      range: [0, 20],
      sort: { sortBy: 'close', sortOrder: 'desc' },
      filter: [{ left: 'close', operation: 'nempty' }],
    };

    const response = await fetch(this.scannerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      this.logger.warn(`Scanner responded ${response.status}`);
      return [];
    }

    const data = (await response.json()) as ScannerResponse;
    if (!data.data) return [];

    return data.data.map((row) => ({
      symbol: row.s,
      name: String(row.d?.[1] ?? ''),
      exchange: row.s.split(':')[0] ?? '',
      indicators: {
        close: row.d?.[2] as number | undefined ?? null,
        change: row.d?.[3] as number | undefined ?? null,
        changePercent: row.d?.[4] as number | undefined ?? null,
        recommendation: row.d?.[5] as number | undefined ?? null,
        rsi: row.d?.[6] as number | undefined ?? null,
        rsiPrev: row.d?.[7] as number | undefined ?? null,
        stochK: row.d?.[8] as number | undefined ?? null,
        stochD: row.d?.[9] as number | undefined ?? null,
        momentum: row.d?.[10] as number | undefined ?? null,
        momentumPrev: row.d?.[11] as number | undefined ?? null,
        macd: row.d?.[12] as number | undefined ?? null,
        macdSignal: row.d?.[13] as number | undefined ?? null,
        ema5: row.d?.[14] as number | undefined ?? null,
        ema10: row.d?.[15] as number | undefined ?? null,
        ema20: row.d?.[16] as number | undefined ?? null,
        sma20: row.d?.[17] as number | undefined ?? null,
        sma50: row.d?.[18] as number | undefined ?? null,
        sma200: row.d?.[19] as number | undefined ?? null,
        bbUpper: row.d?.[20] as number | undefined ?? null,
        bbLower: row.d?.[21] as number | undefined ?? null,
        adx: row.d?.[22] as number | undefined ?? null,
        adxPlusDI: row.d?.[23] as number | undefined ?? null,
        adxMinusDI: row.d?.[24] as number | undefined ?? null,
        ao: row.d?.[25] as number | undefined ?? null,
        aoPrev: row.d?.[26] as number | undefined ?? null,
        atr: row.d?.[27] as number | undefined ?? null,
        high: row.d?.[28] as number | undefined ?? null,
        low: row.d?.[29] as number | undefined ?? null,
      },
    }));
  }

  /** Clear all cached results. */
  clearCache(): void {
    this.cache.clear();
  }

  private toScannerSymbol(symbol: string): string {
    // FOREXCOM:XAUUSD → FX:XAUUSD
    // NASDAQ:AAPL → NASDAQ:AAPL
    if (symbol.startsWith('FOREXCOM:')) {
      return `FX:${symbol.slice(9)}`;
    }
    return symbol;
  }

  private timeframeToInterval(tf: number): string {
    if (tf >= 1440) return '1D';
    if (tf >= 240) return '240';
    if (tf >= 60) return '60';
    if (tf >= 30) return '30';
    if (tf >= 15) return '15';
    if (tf >= 5) return '5';
    return '1';
  }
}
