import { Injectable } from '@nestjs/common';

interface SubscriptionEntry {
  symbol: string;
  refCount: number;
}

/**
 * Manages which symbols are subscribed to the upstream TradingView WebSocket.
 * Uses reference counting so a symbol is only unsubscribed when no consumer
 * needs it anymore.
 */
@Injectable()
export class SymbolSubscriptionManager {
  /** Active subscriptions map: symbol → refCount */
  private readonly subscriptions = new Map<string, SubscriptionEntry>();

  /** Symbols currently subscribed on the wire. */
  private readonly activeOnWire = new Set<string>();

  /**
   * Register interest in a symbol. Returns true if this is the first
   * subscription (caller should send the subscribe message to WS).
   */
  subscribe(symbol: string): boolean {
    const existing = this.subscriptions.get(symbol);
    if (existing) {
      existing.refCount++;
      return false;
    }
    this.subscriptions.set(symbol, { symbol, refCount: 1 });
    this.activeOnWire.add(symbol);
    return true;
  }

  /**
   * Unregister interest. Returns true if refCount reached 0 and the symbol
   * should be unsubscribed from WS.
   */
  unsubscribe(symbol: string): boolean {
    const entry = this.subscriptions.get(symbol);
    if (!entry) return false;
    entry.refCount--;
    if (entry.refCount <= 0) {
      this.subscriptions.delete(symbol);
      this.activeOnWire.delete(symbol);
      return true;
    }
    return false;
  }

  /** All currently subscribed symbols. */
  getActiveSymbols(): string[] {
    return Array.from(this.activeOnWire);
  }

  /** Total subscription count. */
  get size(): number {
    return this.activeOnWire.size;
  }
}
