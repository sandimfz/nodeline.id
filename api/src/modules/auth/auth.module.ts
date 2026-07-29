import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { OAuthController } from './oauth.controller.js';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, JwtAccessStrategy, RolesGuard, JwtAuthGuard],
  exports: [AuthService, RolesGuard, JwtAuthGuard],
})
export class AuthModule {}
