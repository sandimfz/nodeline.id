import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
