import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Rate limit guard per API key using in-memory sliding window.
 * For multi-instance production, replace with Redis-backed implementation.
 */
interface RateWindow {
  /** Minute bucket key: `${apiKeyId}:${minute}` */
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly windows = new Map<string, RateWindow>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey as
      | { id: string; rateLimitPerMin: number }
      | undefined;

    if (!apiKey?.id) {
      return true; // No API key = no rate limit (shouldn't reach here normally)
    }

    const now = Date.now();
    const minuteBucket = Math.floor(now / 60_000);
    const key = `${apiKey.id}:${minuteBucket}`;

    const window = this.windows.get(key);

    if (!window || window.resetAt < now) {
      // New window
      this.windows.set(key, {
        count: 1,
        resetAt: (minuteBucket + 1) * 60_000,
      });
      return true;
    }

    if (window.count >= apiKey.rateLimitPerMin) {
      this.logger.warn(
        `Rate limit exceeded: ${apiKey.id} (${apiKey.rateLimitPerMin}/min)`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${apiKey.rateLimitPerMin} requests per minute.`,
          retryAfter: Math.ceil((window.resetAt - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    window.count++;
    return true;
  }
}
