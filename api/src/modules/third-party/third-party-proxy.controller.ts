import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  InternalServerErrorException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../public-api/guards/api-key.guard.js';
import { RateLimitGuard } from '../usage/rate-limit.guard.js';
import { UserDailyLimitGuard } from '../usage/user-daily-limit.guard.js';
import { UsageInterceptor } from '../usage/usage.interceptor.js';
import { ThirdPartyServiceGuard } from './third-party-service.guard.js';
import { ProxySubscriptionGuard } from './proxy-subscription.guard.js';
import { ThirdPartyProxyService } from './third-party-proxy.service.js';
import type { Request } from 'express';

/**
 * Proxies requests to third-party APIs.
 *
 * All routes require: service active + API key + active subscription.
 * Rate limits and daily quotas are enforced per-subscription plan.
 *
 * URL pattern:  /api/v1/proxy/:slug/*path
 * Example:      GET /api/v1/proxy/giphy/gifs/random?tag=funny
 */
@Controller('proxy')
@UseGuards(
  ThirdPartyServiceGuard,
  ApiKeyGuard,
  ProxySubscriptionGuard,
  RateLimitGuard,
  UserDailyLimitGuard,
)
@UseInterceptors(UsageInterceptor)
export class ThirdPartyProxyController {
  constructor(private readonly proxy: ThirdPartyProxyService) {}

  @Get(':slug/*')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async proxyGet(
    @Param('slug') slug: string,
    @Param('0') path: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ) {
    return this.handleProxy(slug, 'GET', path, query, undefined, req);
  }

  @Post(':slug/*')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async proxyPost(
    @Param('slug') slug: string,
    @Param('0') path: string,
    @Query() query: Record<string, string>,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.handleProxy(slug, 'POST', path, query, body, req);
  }

  @Put(':slug/*')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async proxyPut(
    @Param('slug') slug: string,
    @Param('0') path: string,
    @Query() query: Record<string, string>,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.handleProxy(slug, 'PUT', path, query, body, req);
  }

  @Patch(':slug/*')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async proxyPatch(
    @Param('slug') slug: string,
    @Param('0') path: string,
    @Query() query: Record<string, string>,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.handleProxy(slug, 'PATCH', path, query, body, req);
  }

  @Delete(':slug/*')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async proxyDelete(
    @Param('slug') slug: string,
    @Param('0') path: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ) {
    return this.handleProxy(slug, 'DELETE', path, query, undefined, req);
  }

  // ── Helpers ──

  private async handleProxy(
    slug: string,
    method: string,
    path: string,
    query: Record<string, string>,
    body: unknown | undefined,
    req: Request,
  ): Promise<unknown> {
    try {
      const subscription = (req as any).subscription as
        | { id: string }
        | undefined;
      return await this.proxy.proxy(
        slug,
        method,
        path,
        query,
        body,
        subscription?.id,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new InternalServerErrorException(
          `Proxy error: ${err.message}`,
        );
      }
      throw new InternalServerErrorException('Proxy error');
    }
  }
}
