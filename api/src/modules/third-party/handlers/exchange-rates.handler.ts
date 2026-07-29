import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThirdPartyHandler } from './proxy-handler.interface.js';

/**
 * Abstract Exchange Rates API handler.
 *
 * Injects the API key as the `api_key` query parameter.
 *
 * Docs: https://www.abstractapi.com/api/exchange-rates-api
 */
@Injectable()
export class ExchangeRatesHandler implements ThirdPartyHandler {
  readonly slug = 'exchange-rates';

  private readonly logger = new Logger(ExchangeRatesHandler.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('thirdParty.exchangeRates', '');
  }

  injectApiKey(url: URL, _options: RequestInit): void {
    if (!this.apiKey) {
      this.logger.warn('EXCHANGE_RATES_API_KEY is not set — proxy will likely fail');
      return;
    }
    url.searchParams.set('api_key', this.apiKey);
  }
}
