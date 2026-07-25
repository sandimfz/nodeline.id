import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { apiServices } from '../../../database/drizzle/schema/index.js';

/**
 * Blocks requests when the API service is switched off from the admin panel.
 *
 * A service is considered unavailable when it is unpublished, or its status
 * is anything other than ACTIVE (MAINTENANCE / DEPRECATED).
 *
 * The lookup is cached in memory for a short window so we don't add a DB
 * round-trip to every public API call.
 */
@Injectable()
export class ServiceStatusGuard implements CanActivate {
  private readonly logger = new Logger(ServiceStatusGuard.name);

  /** Slug of the service this guard protects. */
  private static readonly SERVICE_SLUG = 'trading';

  /** How long a status lookup stays cached, in milliseconds. */
  private static readonly CACHE_TTL_MS = 30_000;

  private cached: { available: boolean; reason: string | null; at: number } | null =
    null;

  constructor(private readonly drizzle: DrizzleService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const state = await this.getServiceState();

    if (!state.available) {
      throw new ServiceUnavailableException(
        state.reason ?? 'API sedang tidak tersedia',
      );
    }

    return true;
  }

  private async getServiceState(): Promise<{
    available: boolean;
    reason: string | null;
  }> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < ServiceStatusGuard.CACHE_TTL_MS) {
      return { available: this.cached.available, reason: this.cached.reason };
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
        .where(eq(apiServices.slug, ServiceStatusGuard.SERVICE_SLUG))
        .limit(1);

      // No directory entry yet → don't block; the API predates the directory.
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
      // A failed status lookup must not take the API down.
      this.logger.warn(`Gagal membaca status service: ${String(err)}`);
      return { available: true, reason: null };
    }

    this.cached = { available, reason, at: now };
    return { available, reason };
  }
}
