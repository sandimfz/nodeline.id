import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import { apiServices } from '../../database/drizzle/schema/index.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type { ThirdPartyHandler } from './handlers/proxy-handler.interface.js';

/**
 * Proxies requests to third-party APIs on behalf of authenticated users.
 *
 * Flow:
 *  1. Resolve the service's base URL from the directory (api_services),
 *     cached via Redis for 60s.
 *  2. Find the matching ThirdPartyHandler for key injection.
 *  3. Construct the outbound URL, inject the secret key, fetch, and return.
 *  4. Increment quota_used_today on success.
 */
@Injectable()
export class ThirdPartyProxyService {
  private readonly logger = new Logger(ThirdPartyProxyService.name);
  private readonly handlers = new Map<string, ThirdPartyHandler>();

  // Allow overriding the global fetch for testing
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
  ) {
    this.fetcher = globalThis.fetch.bind(globalThis);
  }

  /**
   * Register a handler. Called automatically by the DI container when
   * all ThirdPartyHandler providers are injected via the module.
   */
  registerHandler(handler: ThirdPartyHandler): void {
    this.handlers.set(handler.slug, handler);
  }

  /**
   * Proxy a request to the third-party service identified by `slug`.
   *
   * @param slug      Service slug (e.g. "giphy", "openweather")
   * @param method    HTTP method (GET, POST, etc.)
   * @param path      Path after the slug (e.g. "gifs/random")
   * @param query     Parsed query parameters from the incoming request
   * @param body      Request body (for POST/PUT/PATCH)
   * @param subscriptionId  The subscription ID to increment quota for
   */
  async proxy(
    slug: string,
    method: string,
    path: string,
    query: Record<string, string>,
    body?: unknown,
    subscriptionId?: string,
  ): Promise<unknown> {
    const baseUrl = await this.resolveBaseUrl(slug);
    if (!baseUrl) {
      throw new Error(`Service "${slug}" tidak memiliki base URL`);
    }

    // Construct the full URL, preserving query params
    const pathWithoutLeading = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(`${baseUrl}/${pathWithoutLeading}`);

    // Forward original query params
    for (const [key, value] of Object.entries(query)) {
      if (!key.startsWith('_')) {
        url.searchParams.set(key, value);
      }
    }

    // Build fetch options
    const options: RequestInit = {
      method,
      headers: {
        Accept: 'application/json',
      },
    };

    // Inject third-party API key via the registered handler
    const handler = this.handlers.get(slug);
    if (handler) {
      handler.injectApiKey(url, options);
    }

    // Attach body for mutating methods
    if (body && method !== 'GET' && method !== 'HEAD') {
      (options.headers as Record<string, string>)['Content-Type'] =
        'application/json';
      options.body = JSON.stringify(body);
    }

    this.logger.debug(`Proxy ${method} ${url.toString()}`);

    const response = await this.fetcher(url.toString(), options);

    // Increment quota on success (2xx)
    if (response.ok && subscriptionId) {
      await this.incrementQuota(subscriptionId);
    }

    // Try to parse as JSON; fall back to text
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * Resolve the base URL for a service slug, cached via Redis for 60s.
   */
  private async resolveBaseUrl(slug: string): Promise<string | null> {
    const cacheKey = `baseurl:${slug}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [service] = await this.drizzle.db
      .select({ baseUrl: apiServices.baseUrl })
      .from(apiServices)
      .where(eq(apiServices.slug, slug))
      .limit(1);

    if (!service) {
      return null;
    }

    await this.redis.set(cacheKey, service.baseUrl, 60);
    return service.baseUrl;
  }

  /**
   * Increment the quota_used_today counter for a subscription.
   */
  private async incrementQuota(subscriptionId: string): Promise<void> {
    try {
      await this.drizzle.db.execute(
        sql`UPDATE api_subscriptions SET quota_used_today = quota_used_today + 1 WHERE id = ${subscriptionId}`,
      );
    } catch (err) {
      this.logger.error(
        `Gagal update quota subscription ${subscriptionId}: ${String(err)}`,
      );
    }
  }
}
