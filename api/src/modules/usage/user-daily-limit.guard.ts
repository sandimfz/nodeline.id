import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';

const DAILY_LIMIT = 50;

/**
 * Per-user daily request limit via Redis.
 *
 * Key:  "daily:{userId}:{YYYY-MM-DD}"
 * - INCR on every request
 * - EXPIREAT end-of-day (auto-reset besok)
 * - Redis handle cleanup, no more periodic timer
 */
@Injectable()
export class UserDailyLimitGuard implements CanActivate {
  private readonly logger = new Logger(UserDailyLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey as { userId?: string } | undefined;
    const subscription = request.subscription as
      | { requestsPerDay: number | null }
      | undefined;

    if (!apiKey?.userId) {
      return true;
    }

    // Per-plan daily limit. null = unlimited (e.g. ENTERPRISE plans).
    const dailyLimit = subscription?.requestsPerDay ?? DAILY_LIMIT;

    if (dailyLimit === null) {
      return true; // Unlimited
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `daily:${apiKey.userId}:${today}`;

    const count = await this.redis.incr(key);
    if (count === null) {
      // Redis unavailable — fail-open
      return true;
    }

    // Set expiry on first increment — end of today
    if (count === 1) {
      const endOfDay = new Date();
      endOfDay.setUTCHours(23, 59, 59, 999);
      const secondsUntilEnd = Math.ceil((endOfDay.getTime() - Date.now()) / 1000);
      await this.redis.expire(key, secondsUntilEnd);
    }

    if (count > dailyLimit) {
      this.logger.warn(
        `Daily limit exceeded: user=${apiKey.userId} (${dailyLimit}/hari)`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Daily request limit exceeded. Max ${dailyLimit} requests per day per user.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
