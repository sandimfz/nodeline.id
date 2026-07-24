import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';

const DAILY_LIMIT = 50;

/**
 * Per-user daily request limit (50 requests/hari).
 *
 * Melacak total request dari SEMUA API key milik user yang sama.
 * Reset otomatis setiap hari.
 *
 * Entry yang sudah lebih dari 2 hari dibersihkan periodik (setiap 10 menit)
 * untuk mencegah memory leak.
 */
@Injectable()
export class UserDailyLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(UserDailyLimitGuard.name);
  private readonly dailyCounts = new Map<string, { count: number; date: string }>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    // Bersihkan entry kadaluarsa setiap 10 menit
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleEntries();
    }, 600_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey as { userId?: string } | undefined;

    if (!apiKey?.userId) {
      return true;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${apiKey.userId}:${today}`;
    const entry = this.dailyCounts.get(key);

    if (!entry || entry.date !== today) {
      this.dailyCounts.set(key, { count: 1, date: today });
      return true;
    }

    if (entry.count >= DAILY_LIMIT) {
      this.logger.warn(
        `Daily limit exceeded: user=${apiKey.userId} (${DAILY_LIMIT}/hari)`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Daily request limit exceeded. Max ${DAILY_LIMIT} requests per day per user.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }

  private cleanupStaleEntries(): void {
    const today = new Date().toISOString().slice(0, 10);
    for (const [key, entry] of this.dailyCounts) {
      if (entry.date !== today) {
        this.dailyCounts.delete(key);
      }
    }
  }
}
