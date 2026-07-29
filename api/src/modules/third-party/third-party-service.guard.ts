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
import { RedisService } from '../../common/redis/redis.service.js';

/**
 * Checks that the requested API service is ACTIVE and published.
 *
 * Cache via Redis for 30 seconds. Fail-open: if Redis/DB fails,
 * the request is allowed through.
 */
@Injectable()
export class ThirdPartyServiceGuard implements CanActivate {
  private readonly logger = new Logger(ThirdPartyServiceGuard.name);

  private static readonly CACHE_TTL_S = 30;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
  ) {}

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
    // Try Redis cache first
    const cacheKey = `svcstatus:${slug}`;
    const cached = await this.redis.getCached<{
      available: boolean;
      reason: string | null;
    }>(cacheKey);
    if (cached) return cached;

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
    } catch (err) {
      this.logger.warn(`Gagal membaca status service "${slug}": ${String(err)}`);
      return { available: true, reason: null };
    }

    // Cache result
    await this.redis.setCached(cacheKey, { available, reason }, ThirdPartyServiceGuard.CACHE_TTL_S);

    return { available, reason };
  }
}
