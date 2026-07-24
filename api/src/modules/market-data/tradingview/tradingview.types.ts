export interface Tick {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume?: number;
  timestamp: number;
}

export interface Candle {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface ScannerResult {
  symbol: string;
  name: string;
  exchange: string;
  indicators: Record<string, number | string | null>;
}

export interface PriceSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: number;
  staleMs: number;
}
