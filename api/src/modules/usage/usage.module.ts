import { Module } from '@nestjs/common';
import { UsageService } from './usage.service.js';
import { UsageInterceptor } from './usage.interceptor.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { UserDailyLimitGuard } from './user-daily-limit.guard.js';

@Module({
  providers: [UsageService, UsageInterceptor, RateLimitGuard, UserDailyLimitGuard],
  exports: [UsageService, UsageInterceptor, RateLimitGuard, UserDailyLimitGuard],
})
export class UsageModule {}
