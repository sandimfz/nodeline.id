import { Module, OnModuleInit } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle/drizzle.module.js';
import { ThirdPartyProxyController } from './third-party-proxy.controller.js';
import { ThirdPartyProxyService } from './third-party-proxy.service.js';
import { ThirdPartyServiceGuard } from './third-party-service.guard.js';
import { ProxySubscriptionGuard } from './proxy-subscription.guard.js';
import { GiphyHandler } from './handlers/giphy.handler.js';
import { OpenweatherHandler } from './handlers/openweather.handler.js';
import { ExchangeRatesHandler } from './handlers/exchange-rates.handler.js';
import { MathApiHandler } from './handlers/math-api.handler.js';

@Module({
  imports: [DrizzleModule],
  controllers: [ThirdPartyProxyController],
  providers: [
    ThirdPartyProxyService,
    ThirdPartyServiceGuard,
    ProxySubscriptionGuard,
    GiphyHandler,
    OpenweatherHandler,
    ExchangeRatesHandler,
    MathApiHandler,
  ],
})
export class ThirdPartyModule implements OnModuleInit {
  constructor(
    private readonly proxy: ThirdPartyProxyService,
    private readonly giphy: GiphyHandler,
    private readonly openweather: OpenweatherHandler,
    private readonly exchangeRates: ExchangeRatesHandler,
    private readonly mathApi: MathApiHandler,
  ) {}

  onModuleInit() {
    // Register all handlers in the proxy service so it knows how to
    // inject the correct API key for each third-party service.
    this.proxy.registerHandler(this.giphy);
    this.proxy.registerHandler(this.openweather);
    this.proxy.registerHandler(this.exchangeRates);
    this.proxy.registerHandler(this.mathApi);
  }
}
