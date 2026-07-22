import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/validation.schema.js';
import { DrizzleModule } from './database/drizzle/drizzle.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { ChatModule } from './modules/chat/chat.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (raw) => {
        const result = envValidationSchema.safeParse(raw);
        if (!result.success) {
          // Surface all missing/invalid vars at once so the operator knows
          // exactly what to fix instead of guessing one-by-one.
          const errors = result.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
          throw new Error(`Invalid environment configuration: ${errors}`);
        }
        return result.data;
      },
    }),
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 100 }, // default ceiling for non-throttled routes
    ]),
    DrizzleModule,
    AuthModule,
    MarketplaceModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
