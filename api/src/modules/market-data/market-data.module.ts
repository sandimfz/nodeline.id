import { Module } from '@nestjs/common';
import { TradingViewSocketService } from './tradingview/tradingview-socket.service.js';
import { SymbolSubscriptionManager } from './tradingview/symbol-subscription.manager.js';
import { CandleBuilderService } from './candles/candle-builder.service.js';
import { CandleRepository } from './candles/candle.repository.js';
import { TradingViewScannerService } from './scanner/tradingview-scanner.service.js';

@Module({
  imports: [],
  providers: [
    SymbolSubscriptionManager,
    TradingViewSocketService,
    CandleBuilderService,
    CandleRepository,
    TradingViewScannerService,
  ],
  exports: [
    TradingViewSocketService,
    CandleBuilderService,
    CandleRepository,
    TradingViewScannerService,
    SymbolSubscriptionManager,
  ],
})
export class MarketDataModule {}
