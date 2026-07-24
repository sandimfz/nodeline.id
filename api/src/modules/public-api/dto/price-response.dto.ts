export class PriceResponseDto {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: number;
  staleMs: number;
}

export class CandlesResponseDto {
  symbol: string;
  interval: string;
  candles: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export class IndicatorsResponseDto {
  symbol: string;
  timeframe: number;
  indicators: Record<string, number | string | null>;
}

export class PriceStreamEventDto {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}
