import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';

/**
 * Rate limit guard per API key using Redis sliding window.
 *
 * Key:  "ratelimit:{apiKeyId}:{minuteBucket}"
 * - INCR on every request
 * - EXPIRE 120s so stale keys auto-cleanup
 * - Reset ke 1 tiap menit baru (minuteBucket berganti)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey as
      | { id: string; rateLimitPerMin: number }
      | undefined;
    const subscription = request.subscription as
      | { requestsPerMinute: number | null }
      | undefined;

    if (!apiKey?.id) {
      return true;
    }

    // Use plan limit from subscription if available, fall back to api_key default
    const rateLimit =
      subscription?.requestsPerMinute ?? apiKey?.rateLimitPerMin ?? 60;

    const now = Date.now();
    const minuteBucket = Math.floor(now / 60_000);
    const key = `ratelimit:${apiKey.id}:${minuteBucket}`;

    const count = await this.redis.incr(key);
    if (count === null) {
      // Redis unavailable — fail-open agar tidak block traffic
      return true;
    }

    // Set expiry on first increment in this window
    if (count === 1) {
      await this.redis.expire(key, 120);
    }

    if (count > rateLimit) {
      const resetAt = (minuteBucket + 1) * 60_000;
      this.logger.warn(
        `Rate limit exceeded: ${apiKey.id} (${rateLimit}/min)`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${rateLimit} requests per minute.`,
          retryAfter: Math.ceil((resetAt - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
