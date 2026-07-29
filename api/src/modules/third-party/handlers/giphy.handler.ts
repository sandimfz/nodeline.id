import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThirdPartyHandler } from './proxy-handler.interface.js';

/**
 * Giphy API handler.
 *
 * Injects the Giphy API key as the `api_key` query parameter.
 *
 * Docs: https://developers.giphy.com/docs/api/
 */
@Injectable()
export class GiphyHandler implements ThirdPartyHandler {
  readonly slug = 'giphy';

  private readonly logger = new Logger(GiphyHandler.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('thirdParty.giphy', '');
  }

  injectApiKey(url: URL, _options: RequestInit): void {
    if (!this.apiKey) {
      this.logger.warn('GIPHY_API_KEY is not set — proxy will likely fail');
      return;
    }
    url.searchParams.set('api_key', this.apiKey);
  }
}
