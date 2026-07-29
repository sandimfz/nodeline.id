import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThirdPartyHandler } from './proxy-handler.interface.js';

/**
 * OpenWeatherMap API handler.
 *
 * Injects the API key as the `appid` query parameter.
 *
 * Docs: https://openweathermap.org/api
 */
@Injectable()
export class OpenweatherHandler implements ThirdPartyHandler {
  readonly slug = 'openweather';

  private readonly logger = new Logger(OpenweatherHandler.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('thirdParty.openweather', '');
  }

  injectApiKey(url: URL, _options: RequestInit): void {
    if (!this.apiKey) {
      this.logger.warn('OPENWEATHERMAP_API_KEY is not set — proxy will likely fail');
      return;
    }
    url.searchParams.set('appid', this.apiKey);
  }
}
