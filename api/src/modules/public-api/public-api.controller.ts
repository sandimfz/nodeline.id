import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Response, Request } from 'express';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ServiceStatusGuard } from './guards/service-status.guard.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import { UserDailyLimitGuard } from '../usage/user-daily-limit.guard.js';
import { UsageInterceptor } from '../usage/usage.interceptor.js';
import { CurrentApiKey } from '../../common/decorators/current-api-key.decorator.js';
import { TradingViewSocketService } from '../market-data/tradingview/tradingview-socket.service.js';
import { TradingViewScannerService } from '../market-data/scanner/tradingview-scanner.service.js';
import { CandleBuilderService } from '../market-data/candles/candle-builder.service.js';
import { CandleRepository } from '../market-data/candles/candle.repository.js';
import { CandlesQueryDto, IndicatorsQueryDto } from './dto/candles-query.dto.js';
import type { PriceSnapshot, Candle } from '../market-data/tradingview/tradingview.types.js';

/** Symbols that are supported by the public API. */
const SUPPORTED_SYMBOLS = new Set([
  'FOREXCOM:XAUUSD',
  'FOREXCOM:XAGUSD',
  'FOREXCOM:GBPUSD',
  'FOREXCOM:EURUSD',
  'FOREXCOM:USDJPY',
  'FOREXCOM:USDCAD',
  'FOREXCOM:USDCHF',
  'FOREXCOM:AUDUSD',
  'FOREXCOM:NZDUSD',
  'NASDAQ:AAPL',
  'NASDAQ:GOOGL',
  'NASDAQ:MSFT',
  'NASDAQ:TSLA',
  'NASDAQ:AMZN',
  'NASDAQ:META',
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
]);

/**
 * Map short symbol names to TradingView full symbols.
 * User cukup pakai XAUUSD, backend mapping ke FOREXCOM:XAUUSD secara internal.
 */
const SYMBOL_MAP: Record<string, string> = {
  // Forex
  XAUUSD: 'FOREXCOM:XAUUSD',
  XAGUSD: 'FOREXCOM:XAGUSD',
  GBPUSD: 'FOREXCOM:GBPUSD',
  EURUSD: 'FOREXCOM:EURUSD',
  USDJPY: 'FOREXCOM:USDJPY',
  USDCAD: 'FOREXCOM:USDCAD',
  USDCHF: 'FOREXCOM:USDCHF',
  AUDUSD: 'FOREXCOM:AUDUSD',
  NZDUSD: 'FOREXCOM:NZDUSD',
  // Stocks
  AAPL: 'NASDAQ:AAPL',
  GOOGL: 'NASDAQ:GOOGL',
  MSFT: 'NASDAQ:MSFT',
  TSLA: 'NASDAQ:TSLA',
  AMZN: 'NASDAQ:AMZN',
  META: 'NASDAQ:META',
  // Crypto
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  // Market cap (terpisah dari harga real-time)
  BTCCAP: 'CRYPTOCAP:BTC',
  ETHCAP: 'CRYPTOCAP:ETH',
};

@Controller('market')
@UseGuards(ServiceStatusGuard, ApiKeyGuard, RateLimitGuard, UserDailyLimitGuard)
@UseInterceptors(UsageInterceptor)
export class PublicApiController {
  private readonly logger = new Logger(PublicApiController.name);

  constructor(
    private readonly tradingView: TradingViewSocketService,
    private readonly scanner: TradingViewScannerService,
    private readonly candleBuilder: CandleBuilderService,
    private readonly candleRepo: CandleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * GET /v1/market/price/:symbol — Snapshot harga terakhir.
   */
  @Get('price/:symbol')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getPrice(
    @Param('symbol') symbol: string,
    @CurrentApiKey('allowedSymbols') allowedSymbols: string[] | null,
  ): Promise<PriceSnapshot> {
    this.validateSymbol(symbol, allowedSymbols);

    const tvSymbol = this.resolveSymbol(symbol);
    // Ensure symbol is subscribed to get live data
    this.tradingView.subscribe(tvSymbol);

    const snapshot = this.tradingView.getSnapshot(tvSymbol);

    if (!snapshot) {
      throw new NotFoundException(
        `Data harga untuk ${symbol} tidak tersedia saat ini`,
      );
    }

    // Return response with user's short name, not internal TradingView symbol
    return { ...snapshot, symbol };
  }

  /**
   * GET /v1/market/candles/:symbol — Histori candle.
   */
  @Get('candles/:symbol')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getCandles(
    @Param('symbol') symbol: string,
    @Query() query: CandlesQueryDto,
    @CurrentApiKey('allowedSymbols') allowedSymbols: string[] | null,
  ) {
    this.validateSymbol(symbol, allowedSymbols);

    const tvSymbol = this.resolveSymbol(symbol);
    // Ensure symbol is subscribed
    this.tradingView.subscribe(tvSymbol);

    const interval = this.validateInterval(query.interval ?? '1m');
    const limit = query.limit ?? 100;

    // Try DB first (persisted candles), then in-memory
    const dbCandles = await this.candleRepo.queryCandles(tvSymbol, interval, limit);
    const candles = dbCandles.length > 0
      ? dbCandles
      : this.candleBuilder.getCandles(tvSymbol, interval, limit);

    // Map symbol back to user's short name
    const mapped = candles.map((c) => ({ ...c, symbol }));
    return { symbol, interval, candles: mapped };
  }

  /**
   * GET /v1/market/price/:symbol/candle — Aggregasi OHLC per interval.
   *
   * Mengembalikan candle yang sedang aktif (in-progress) untuk interval
   * yang diminta — 1m, 5m, 15m, 1h.
   *
   * Berguna untuk menampilkan harga Open, High, Low, Close dalam bentuk
   * candlestick dari data tick real-time.
   */
  @Get('price/:symbol/candle')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getPriceCandle(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string = '1m',
    @CurrentApiKey('allowedSymbols') allowedSymbols: string[] | null,
  ) {
    this.validateSymbol(symbol, allowedSymbols);

    const tvSymbol = this.resolveSymbol(symbol);
    this.tradingView.subscribe(tvSymbol);

    const validInterval = this.validateInterval(interval);
    const candle = this.candleBuilder.getActiveCandle(tvSymbol, validInterval);

    if (!candle) {
      throw new NotFoundException(
        `Data candle untuk ${symbol} (${interval}) belum tersedia`,
      );
    }

    return { ...candle, symbol };
  }

  /**
   * GET /v1/market/indicators/:symbol — Indikator teknikal.
   */
  @Get('indicators/:symbol')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getIndicators(
    @Param('symbol') symbol: string,
    @Query() query: IndicatorsQueryDto,
    @CurrentApiKey('allowedSymbols') allowedSymbols: string[] | null,
  ) {
    this.validateSymbol(symbol, allowedSymbols);

    const tvSymbol = this.resolveSymbol(symbol);
    // Ensure symbol is subscribed
    this.tradingView.subscribe(tvSymbol);

    const result = await this.scanner.getIndicators(tvSymbol, query.timeframe ?? 1);

    if (!result) {
      throw new NotFoundException(
        `Indikator untuk ${symbol} tidak tersedia saat ini`,
      );
    }

    return {
      symbol,
      timeframe: query.timeframe ?? 1,
      indicators: result.indicators,
    };
  }

  /**
   * GET /v1/market/price/:symbol/stream — SSE realtime stream.
   *
   * Catatan untuk customer:
   * Gunakan `fetch` + `ReadableStream` di server-side Anda (bukan EventSource
   * dari browser), karena API key akan ter-expose di header Authorization.
   */
  @Get('price/:symbol/stream')
  @HttpCode(HttpStatus.OK)
  async streamPrice(
    @Param('symbol') symbol: string,
    @CurrentApiKey('allowedSymbols') allowedSymbols: string[] | null,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    this.validateSymbol(symbol, allowedSymbols);

    const tvSymbol = this.resolveSymbol(symbol);
    // Ensure symbol is subscribed for real-time data
    this.tradingView.subscribe(tvSymbol);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial snapshot
    const snapshot = this.tradingView.getSnapshot(tvSymbol);
    if (snapshot) {
      res.write(`data: ${JSON.stringify({ ...snapshot, symbol })}\n\n`);
    }

    // Subscribe to real-time ticks
    const handler = (tick: { symbol: string; price: number; change: number; changePercent: number; timestamp: number }) => {
      if (tick.symbol !== tvSymbol) return;
      res.write(`data: ${JSON.stringify({ ...tick, symbol })}\n\n`);
    };

    this.eventEmitter.on('tradingview.tick', handler);

    // Cleanup on disconnect
    req.on('close', () => {
      this.eventEmitter.off('tradingview.tick', handler);
    });
  }

  // ── Helpers ──

  /**
   * Map short name → full TradingView symbol, or return as-is if not in map
   * (supports direct usage like FOREXCOM:XAUUSD for backward compat).
   */
  private resolveSymbol(symbol: string): string {
    return SYMBOL_MAP[symbol] ?? symbol;
  }

  private validateSymbol(symbol: string, allowedSymbols: string[] | null): void {
    const mapped = this.resolveSymbol(symbol);
    if (!SUPPORTED_SYMBOLS.has(mapped)) {
      throw new NotFoundException(`Symbol ${symbol} tidak didukung`);
    }

    if (allowedSymbols && !allowedSymbols.includes(mapped)) {
      throw new ForbiddenException(
        `API key tidak memiliki akses ke symbol ${symbol}`,
      );
    }
  }

  private validateInterval(interval: string): string {
    const valid = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
    if (!valid.includes(interval)) {
      throw new NotFoundException(
        `Interval ${interval} tidak valid. Gunakan: ${valid.join(', ')}`,
      );
    }
    return interval;
  }
}
