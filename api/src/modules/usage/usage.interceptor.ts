import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { UsageService } from './usage.service.js';

/**
 * Interceptor that logs every API call made with an API key.
 * Reads the authenticated API key from `request.apiKey` (set by ApiKeyGuard).
 */
@Injectable()
export class UsageInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageInterceptor.name);

  constructor(private readonly usage: UsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey as { id?: string } | undefined;

    if (!apiKey?.id) {
      return next.handle();
    }

    const endpoint = `${request.method} ${request.route?.path ?? request.url}`;
    const ipAddress = request.ip ?? request.socket?.remoteAddress ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.usage.logRequest({
            apiKeyId: apiKey.id!,
            endpoint,
            statusCode: response.statusCode,
            ipAddress,
          });
        },
        error: (err) => {
          this.usage.logRequest({
            apiKeyId: apiKey.id!,
            endpoint,
            statusCode: err.status ?? 500,
            ipAddress,
          });
        },
      }),
    );
  }
}
