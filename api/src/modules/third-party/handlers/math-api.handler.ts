import { Injectable } from '@nestjs/common';
import type { ThirdPartyHandler } from './proxy-handler.interface.js';

/**
 * ClearLLC Math API handler.
 *
 * The Math API publicly available endpoints may not require an API key for
 * basic operations. This handler is a no-op — no key is injected.
 *
 * If ClearLLC later requires authentication, add the key injection here.
 *
 * Docs: https://www.mathcloud.com/api (ClearLLC math provider)
 */
@Injectable()
export class MathApiHandler implements ThirdPartyHandler {
  readonly slug = 'math-api';

  injectApiKey(_url: URL, _options: RequestInit): void {
    // No API key required for this service
  }
}
