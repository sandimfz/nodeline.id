import {
  Injectable,
  CanActivate,
  ExecutionContext,
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
 * Optionally looks up a subscription for (apiKey, service).
 *
 * If an active subscription exists, attaches its plan limits to
 * `request.subscription` so downstream guards can use per-plan
 * rate limits and daily quotas.
 *
 * If no subscription exists, the request still proceeds — the
 * API key's default plan limits are used instead.
 *
 * This mirrors how the Trading API works: FREE by default,
 * subscribe to unlock higher limits.
 */
@Injectable()
export class ProxySubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(ProxySubscriptionGuard.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug as string | undefined;
    const apiKeyId = request.apiKey?.id as string | undefined;

    if (!slug || !apiKeyId) {
      return true;
    }

    try {
      const subscription = await this.drizzle.db
        .select({
          id: apiSubscriptions.id,
          status: apiSubscriptions.status,
          quotaUsedToday: apiSubscriptions.quotaUsedToday,
          quotaResetAt: apiSubscriptions.quotaResetAt,
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
            eq(apiSubscriptions.status, 'ACTIVE'),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (subscription) {
        request.subscription = {
          id: subscription.id,
          quotaUsedToday: subscription.quotaUsedToday,
          quotaResetAt: subscription.quotaResetAt,
          planName: subscription.planName,
          requestsPerDay: subscription.requestsPerDay,
          requestsPerMinute: subscription.requestsPerMinute,
        };
      }
    } catch (err) {
      // Fail-open: subscription lookup failure must not block the API
      this.logger.warn(`Gagal lookup subscription: ${String(err)}`);
    }

    return true;
  }
}
