import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiDirectoryService } from './api-directory.service.js';
import { ListServicesQueryDto, SubscribeDto } from './dto/api-directory.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

/**
 * Public API Directory endpoints.
 * Browsing is public (rate limited). Subscribe requires auth.
 */
@Controller('api-services')
export class ApiDirectoryController {
  constructor(private readonly directory: ApiDirectoryService) {}

  /** List published API services (public, paginated) */
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Query() query: ListServicesQueryDto) {
    return this.directory.listPublished(query);
  }

  /** Get API service detail by slug (public) */
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string) {
    const service = await this.directory.findBySlug(slug);
    const [endpoints, plans] = await Promise.all([
      this.directory.getEndpoints(service.id),
      this.directory.getPlans(service.id),
    ]);
    return { ...service, endpoints, plans };
  }

  /** Get endpoints for a service (public) */
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get(':slug/endpoints')
  @HttpCode(HttpStatus.OK)
  async getEndpoints(@Param('slug') slug: string) {
    const service = await this.directory.findBySlug(slug);
    return this.directory.getEndpoints(service.id);
  }

  /** Get plans for a service (public) */
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get(':slug/plans')
  @HttpCode(HttpStatus.OK)
  async getPlans(@Param('slug') slug: string) {
    const service = await this.directory.findBySlug(slug);
    return this.directory.getPlans(service.id);
  }

  /** Subscribe to an API service (authenticated) */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post(':slug/subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Param('slug') slug: string,
    @Body() dto: SubscribeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.directory.subscribe(user.id, slug, dto.planName);
  }
}
