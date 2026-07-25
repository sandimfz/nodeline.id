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
  'CRYPTOCAP:BTC',
  'CRYPTOCAP:ETH',
]);

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

    // Ensure symbol is subscribed to get live data
    this.tradingView.subscribe(symbol);

    const snapshot = this.tradingView.getSnapshot(symbol);

    if (!snapshot) {
      throw new NotFoundException(
        `Data harga untuk ${symbol} tidak tersedia saat ini`,
      );
    }

    return snapshot;
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

    // Ensure symbol is subscribed
    this.tradingView.subscribe(symbol);

    const interval = this.validateInterval(query.interval ?? '1m');
    const limit = query.limit ?? 100;

    // Try DB first (persisted candles), then in-memory
    const dbCandles = await this.candleRepo.queryCandles(symbol, interval, limit);
    const candles = dbCandles.length > 0
      ? dbCandles
      : this.candleBuilder.getCandles(symbol, interval, limit);

    return { symbol, interval, candles };
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
    this.tradingView.subscribe(symbol);

    const validInterval = this.validateInterval(interval);
    const candle = this.candleBuilder.getActiveCandle(symbol, validInterval);

    if (!candle) {
      throw new NotFoundException(
        `Data candle untuk ${symbol} (${interval}) belum tersedia`,
      );
    }

    return candle;
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

    // Ensure symbol is subscribed
    this.tradingView.subscribe(symbol);

    const result = await this.scanner.getIndicators(symbol, query.timeframe ?? 1);

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

    // Ensure symbol is subscribed for real-time data
    this.tradingView.subscribe(symbol);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial snapshot
    const snapshot = this.tradingView.getSnapshot(symbol);
    if (snapshot) {
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    }

    // Subscribe to real-time ticks
    const handler = (tick: { symbol: string; price: number; change: number; changePercent: number; timestamp: number }) => {
      if (tick.symbol !== symbol) return;
      res.write(`data: ${JSON.stringify(tick)}\n\n`);
    };

    this.eventEmitter.on('tradingview.tick', handler);

    // Cleanup on disconnect
    req.on('close', () => {
      this.eventEmitter.off('tradingview.tick', handler);
    });
  }

  // ── Helpers ──

  private validateSymbol(symbol: string, allowedSymbols: string[] | null): void {
    if (!SUPPORTED_SYMBOLS.has(symbol)) {
      throw new NotFoundException(`Symbol ${symbol} tidak didukung`);
    }

    if (allowedSymbols && !allowedSymbols.includes(symbol)) {
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
