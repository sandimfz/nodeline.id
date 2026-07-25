import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ServiceStatusGuard } from './guards/service-status.guard.js';
import { UsageInterceptor } from '../usage/usage.interceptor.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import { UserDailyLimitGuard } from '../usage/user-daily-limit.guard.js';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { UsageModule } from '../usage/usage.module.js';
import { MarketDataModule } from '../market-data/market-data.module.js';

@Module({
  imports: [ApiKeysModule, UsageModule, MarketDataModule],
  controllers: [PublicApiController],
  providers: [
    ApiKeyGuard,
    ServiceStatusGuard,
    RateLimitGuard,
    UserDailyLimitGuard,
    UsageInterceptor,
  ],
})
export class PublicApiModule {}
