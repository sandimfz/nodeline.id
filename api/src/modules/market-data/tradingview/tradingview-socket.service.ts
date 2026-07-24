import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';
import { randomBytes } from 'node:crypto';
import { SymbolSubscriptionManager } from './symbol-subscription.manager.js';
import type { Tick, PriceSnapshot } from './tradingview.types.js';

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 60_000;

/** Default symbols to subscribe on first connect. */
const DEFAULT_SYMBOLS = ['FOREXCOM:XAUUSD', 'FOREXCOM:XAGUSD', 'FOREXCOM:EURUSD'];


/**
 * Singleton WebSocket client for TradingView data feed.
 *
 * Protocol reference (Python working implementation):
 * - URL: wss://data.tradingview.com/socket.io/websocket
 * - Format: {"m": "method", "p": [params]}
 * - Auth: set_auth_token with "unauthorized_user_token"
 * - Ping: ~h~ messages are echoed back
 * - Quote data: {"m":"qsd","p":["session",{"n":"symbol","v":{"lp":price,...}}]}
 */
@Injectable()
export class TradingViewSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TradingViewSocketService.name);
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private buffer = '';
  private sessionId = '';

  /** Latest tick per symbol */
  private readonly latestTicks = new Map<string, Tick>();

  /** Ring-buffer tick history per symbol (max 3600 ticks). */
  private readonly tickHistory = new Map<string, Tick[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly subscriptionManager: SymbolSubscriptionManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.connect();
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    this.clearReconnect();
    this.ws?.close();
  }

  // ── Public API ──

  getSnapshot(symbol: string): PriceSnapshot | null {
    const tick = this.latestTicks.get(symbol);
    if (!tick) return null;
    const now = Date.now();
    return {
      symbol: tick.symbol,
      price: tick.price,
      change: tick.change,
      changePercent: tick.changePercent,
      high: tick.high,
      low: tick.low,
      timestamp: tick.timestamp,
      staleMs: now - tick.timestamp,
    };
  }

  getTickHistory(symbol: string, limit = 100): Tick[] {
    const history = this.tickHistory.get(symbol);
    if (!history) return [];
    return history.slice(-limit);
  }

  subscribe(symbol: string): void {
    const needsWire = this.subscriptionManager.subscribe(symbol);
    if (needsWire && this.ws?.readyState === WebSocket.OPEN) {
      this.sendAddSymbol(symbol);
    }
  }

  unsubscribe(symbol: string): void {
    const shouldRemove = this.subscriptionManager.unsubscribe(symbol);
    if (shouldRemove && this.ws?.readyState === WebSocket.OPEN) {
      this.sendRemoveSymbol(symbol);
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Connection Management ──

  private connect(): void {
    if (this.destroyed) return;

    const url = 'wss://data.tradingview.com/socket.io/websocket';
    this.logger.log(`Connecting to TradingView WS: ${url}`);

    this.ws = new WebSocket(url, {
      headers: { Origin: 'https://data.tradingview.com' },
    });

    this.ws.on('open', () => {
      this.logger.log('TradingView WS connected');
      this.reconnectAttempt = 0;
      this.buffer = '';

      // Step 1: Authenticate with unauthorized token
      this.sendRaw(
        JSON.stringify({ m: 'set_auth_token', p: ['unauthorized_user_token'] }),
      );

      // Step 2: Create a new session
      this.sessionId = 'qs_' + randomBytes(6).toString('hex');
      this.sendRaw(
        JSON.stringify({ m: 'quote_create_session', p: [this.sessionId] }),
      );

      // Step 3: Subscribe to default symbols + any active subscriptions
      // IMPORTANT: quote_add_symbols must come BEFORE quote_set_fields
      // (matching the working Python implementation order)
      const activeSymbols = this.subscriptionManager.getActiveSymbols();
      const toSubscribe =
        activeSymbols.length > 0 ? activeSymbols : DEFAULT_SYMBOLS;

      // Also register default symbols in the manager so refcounting works
      if (activeSymbols.length === 0) {
        for (const symbol of DEFAULT_SYMBOLS) {
          this.subscriptionManager.subscribe(symbol);
        }
      }

      for (const symbol of toSubscribe) {
        this.sendAddSymbol(symbol);
      }

      // Step 4: Set which fields to receive in quote updates
      this.sendRaw(
        JSON.stringify({
          m: 'quote_set_fields',
          p: [this.sessionId, 'lp', 'ch', 'chp', 'high_price', 'low_price'],
        }),
      );

      this.eventEmitter.emit('tradingview.connected');
    });

    this.ws.on('message', (raw: Buffer | string) => {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      this.handleRawData(text);
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.logger.warn(
        `TradingView WS closed: code=${code} reason=${reason?.toString()}`,
      );
      this.eventEmitter.emit('tradingview.disconnected');
      this.scheduleReconnect();
    });

    this.ws.on('error', (err: Error) => {
      this.logger.error(`TradingView WS error: ${err.message}`);
    });
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    this.clearReconnect();

    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempt +
        Math.random() * 1_000,
      RECONNECT_MAX_MS,
    );

    this.reconnectAttempt++;
    this.logger.log(
      `Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.ws?.removeAllListeners();
      this.buffer = '';
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Protocol ──

  /**
   * Handle raw WebSocket data.
   *
   * Protocol:
   * - `~h~{num}` → ping, echo back as-is
   * - `~m~{len}~m~{json}` → multiplexed JSON message
   */
  private handleRawData(text: string): void {
    // Handle ping (~h~ messages)
    if (text.startsWith('~h~')) {
      // Echo back the ping to keep connection alive
      this.ws?.send(text);
      return;
    }

    // Parse multiplexed ~m~ messages
    this.buffer += text;

    while (this.buffer.length > 0) {
      if (!this.buffer.startsWith('~m~')) {
        this.buffer = '';
        break;
      }

      const afterFirst = this.buffer.slice(3);
      const delimIdx = afterFirst.indexOf('~m~');
      if (delimIdx === -1) break;

      const lenStr = afterFirst.slice(0, delimIdx);
      const payloadLen = Number.parseInt(lenStr, 10);
      if (Number.isNaN(payloadLen)) {
        this.buffer = '';
        break;
      }

      const payloadStart = delimIdx + 3 + 3;
      if (this.buffer.length < payloadStart + payloadLen) break;

      const rawPayload = this.buffer.slice(
        payloadStart,
        payloadStart + payloadLen,
      );
      this.buffer = this.buffer.slice(payloadStart + payloadLen);

      try {
        const msg = JSON.parse(rawPayload);
        this.handleMessage(msg);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    const method = msg.m as string | undefined;

    if (method === 'qsd') {
      // Quote data update
      const params = msg.p as unknown[];
      if (params && params.length >= 2) {
        const data = params[1] as Record<string, unknown> | undefined;
        if (data?.v) {
          this.handleQuoteUpdate(
            String(data.n ?? ''),
            data.v as Record<string, unknown>,
          );
        }
      }
    }

    // quote_completed — symbols added successfully, no action needed
    // protocol_error — log and ignore
    if (method === 'protocol_error') {
      this.logger.warn(`TradingView protocol error: ${JSON.stringify(msg)}`);
    }
  }

  private handleQuoteUpdate(
    symbol: string,
    values: Record<string, unknown>,
  ): void {
    const price = Number(values.lp ?? 0);
    if (price === 0) return; // Skip empty quotes

    const change = Number(values.ch ?? 0);
    const changePercent = Number(values.chp ?? 0);
    const high = Number(values.high_price ?? 0);
    const low = Number(values.low_price ?? 0);
    const timestamp = Date.now();

    const tick: Tick = {
      symbol,
      price,
      change,
      changePercent,
      high,
      low,
      timestamp,
    };

    this.latestTicks.set(symbol, tick);

    let history = this.tickHistory.get(symbol);
    if (!history) {
      history = [];
      this.tickHistory.set(symbol, history);
    }
    history.push(tick);
    if (history.length > 3600) {
      history.shift();
    }

    this.eventEmitter.emit('tradingview.tick', tick);
  }

  // ── Protocol Helpers ──

  /** Add a symbol subscription. */
  private sendAddSymbol(symbol: string): void {
    this.sendRaw(
      JSON.stringify({
        m: 'quote_add_symbols',
        p: [this.sessionId, symbol],
      }),
    );
  }

  /** Remove a symbol subscription. */
  private sendRemoveSymbol(symbol: string): void {
    this.sendRaw(
      JSON.stringify({
        m: 'quote_remove_symbols',
        p: [this.sessionId, symbol],
      }),
    );
  }

  /** Send raw text through the WS with the ~m~ protocol framing. */
  private sendRaw(payload: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const framed = `~m~${payload.length}~m~${payload}`;
    this.ws.send(framed);
  }
}
