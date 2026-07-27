import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiDirectoryService } from './api-directory.service.js';
import {
  CreateServiceDto,
  UpdateServiceDto,
  CreateEndpointDto,
  CreatePlanDto,
} from './dto/api-directory.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

/**
 * Admin-only endpoints for managing API Directory.
 */
@Controller('api-services/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('god')
export class ApiDirectoryAdminController {
  constructor(private readonly directory: ApiDirectoryService) {}

  /** List all services including unpublished ones */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listAll() {
    return this.directory.listAll();
  }

  /** Create a new API service */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createService(@Body() dto: CreateServiceDto) {
    return this.directory.createService(dto);
  }

  /** Update an API service */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.directory.updateService(id, dto);
  }

  /** Delete an API service */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteService(@Param('id') id: string) {
    return this.directory.deleteService(id);
  }

  /** Add an endpoint to a service */
  @Post(':id/endpoints')
  @HttpCode(HttpStatus.CREATED)
  async createEndpoint(@Param('id') id: string, @Body() dto: CreateEndpointDto) {
    return this.directory.createEndpoint(id, dto);
  }

  /** Add a plan to a service */
  @Post(':id/plans')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Param('id') id: string, @Body() dto: CreatePlanDto) {
    return this.directory.createPlan(id, dto);
  }

  // ─── Subscription Orders Management ─────────────────────────

  /** List all subscription orders (admin view) */
  @Get('subscription-orders')
  @HttpCode(HttpStatus.OK)
  async listSubscriptionOrders() {
    return this.directory.listAllSubscriptionOrders();
  }

  /** List pending subscription orders only */
  @Get('subscription-orders/pending')
  @HttpCode(HttpStatus.OK)
  async listPendingOrders() {
    return this.directory.listPendingSubscriptionOrders();
  }

  /** Confirm subscription payment — activates subscription + generates API key */
  @Post('subscription-orders/:orderId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Param('orderId') orderId: string) {
    return this.directory.confirmSubscriptionPayment(orderId);
  }

  /** Cancel subscription order */
  @Post('subscription-orders/:orderId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() body: { reason?: string },
  ) {
    return this.directory.cancelSubscriptionOrder(orderId, body.reason);
  }
}
