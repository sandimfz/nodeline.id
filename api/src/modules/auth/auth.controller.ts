import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { RegisterDto, UpdateProfileDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: { rawRefreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refreshTokens(user.rawRefreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: { cookies?: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.config.get<string>('refreshCookie.name')!;
    const rawRefreshToken = req.cookies?.[cookieName];
    await this.auth.logout(rawRefreshToken);
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: this.config.get<boolean>('refreshCookie.secure'),
      sameSite: this.config.get<'strict' | 'lax' | 'none'>(
        'refreshCookie.sameSite',
      ),
    });
    return { message: 'Logged out' };
  }

  /** List all users — admin only */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @Get('admin/users')
  @HttpCode(HttpStatus.OK)
  async findAllUsers() {
    return this.auth.findAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: { id: string }) {
    const profile = await this.auth.getUserById(user.id);
    if (!profile) {
      return { message: 'User not found' };
    }
    return profile;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: { id: string },
  ) {
    // ValidationPipe with forbidNonWhitelisted already rejects extra fields
    const updated = await this.auth.updateUser(user.id, dto);
    return updated;
  }

  private setRefreshCookie(res: Response, rawRefreshToken: string) {
    const cookieName = this.config.get<string>('refreshCookie.name')!;
    res.cookie(cookieName, rawRefreshToken, {
      httpOnly: true,
      secure: this.config.get<boolean>('refreshCookie.secure'),
      sameSite: this.config.get<'strict' | 'lax' | 'none'>(
        'refreshCookie.sameSite',
      ),
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
    });
  }
}
