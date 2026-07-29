import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import { apiServices } from '../../database/drizzle/schema/index.js';

/**
 * Checks that the requested API service is ACTIVE and published.
 *
 * Caches the result for 30 seconds to avoid a DB round-trip on every request.
 * Fail-open: if the DB lookup fails, the request is allowed through so a
 * transient DB issue doesn't take all proxy endpoints down.
 */
@Injectable()
export class ThirdPartyServiceGuard implements CanActivate {
  private readonly logger = new Logger(ThirdPartyServiceGuard.name);

  private static readonly CACHE_TTL_MS = 30_000;

  private readonly cache = new Map<
    string,
    { available: boolean; reason: string | null; at: number }
  >();

  constructor(private readonly drizzle: DrizzleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug as string | undefined;

    if (!slug) {
      throw new ServiceUnavailableException('Service slug tidak ditemukan');
    }

    const state = await this.getServiceState(slug);

    if (!state.available) {
      throw new ServiceUnavailableException(
        state.reason ?? 'API sedang tidak tersedia',
      );
    }

    return true;
  }

  private async getServiceState(slug: string): Promise<{
    available: boolean;
    reason: string | null;
  }> {
    const now = Date.now();
    const cached = this.cache.get(slug);
    if (cached && now - cached.at < ThirdPartyServiceGuard.CACHE_TTL_MS) {
      return { available: cached.available, reason: cached.reason };
    }

    let available = true;
    let reason: string | null = null;

    try {
      const [service] = await this.drizzle.db
        .select({
          isPublished: apiServices.isPublished,
          status: apiServices.status,
        })
        .from(apiServices)
        .where(eq(apiServices.slug, slug))
        .limit(1);

      if (service) {
        if (!service.isPublished) {
          available = false;
          reason = 'API sedang dinonaktifkan';
        } else if (service.status === 'MAINTENANCE') {
          available = false;
          reason = 'API sedang dalam pemeliharaan';
        } else if (service.status === 'DEPRECATED') {
          available = false;
          reason = 'API sudah tidak didukung';
        }
      }
      // No directory entry → don't block; the proxy can still forward
    } catch (err) {
      this.logger.warn(`Gagal membaca status service "${slug}": ${String(err)}`);
      return { available: true, reason: null };
    }

    this.cache.set(slug, { available, reason, at: now });
    return { available, reason };
  }
}
