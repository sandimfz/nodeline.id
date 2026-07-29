import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import {
  apiSubscriptions,
  apiServices,
  apiPlans,
} from '../../database/drizzle/schema/index.js';

/**
 * Validates that the authenticated API key has an ACTIVE subscription for
 * the requested service (identified by slug in the URL path).
 *
 * On success, attaches the subscription + plan details to
 * `request.subscription` so downstream guards (RateLimitGuard,
 * UserDailyLimitGuard) can read per-plan limits.
 */
@Injectable()
export class ProxySubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(ProxySubscriptionGuard.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug as string | undefined;
    const apiKeyId = request.apiKey?.id as string | undefined;

    if (!slug) {
      throw new ForbiddenException('Service slug tidak ditemukan');
    }
    if (!apiKeyId) {
      throw new ForbiddenException('API key tidak valid');
    }

    const subscription = await this.drizzle.db
      .select({
        id: apiSubscriptions.id,
        status: apiSubscriptions.status,
        quotaUsedToday: apiSubscriptions.quotaUsedToday,
        quotaResetAt: apiSubscriptions.quotaResetAt,
        planId: apiPlans.id,
        planName: apiPlans.name,
        requestsPerDay: apiPlans.requestsPerDay,
        requestsPerMinute: apiPlans.requestsPerMinute,
      })
      .from(apiSubscriptions)
      .innerJoin(
        apiServices,
        eq(apiSubscriptions.serviceId, apiServices.id),
      )
      .innerJoin(apiPlans, eq(apiSubscriptions.planId, apiPlans.id))
      .where(
        and(
          eq(apiSubscriptions.apiKeyId, apiKeyId),
          eq(apiServices.slug, slug),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Tidak ada subscription aktif untuk layanan ini. Silakan subscribe terlebih dahulu.',
      );
    }

    // Attach plan + subscription info so downstream guards can use it
    request.subscription = {
      id: subscription.id,
      quotaUsedToday: subscription.quotaUsedToday,
      quotaResetAt: subscription.quotaResetAt,
      planName: subscription.planName,
      requestsPerDay: subscription.requestsPerDay,
      requestsPerMinute: subscription.requestsPerMinute,
    };

    return true;
  }
}
