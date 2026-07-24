import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { OrdersService } from './orders.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';

interface AuthedUser {
  id: string;
  role: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // anti spam-order
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  checkout(@CurrentUser() user: AuthedUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.id, {
      whatsappNumber: dto.whatsappNumber,
      items: dto.items,
      paymentNote: dto.paymentNote,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findMine(@CurrentUser() user: AuthedUser) {
    return this.orders.findOwnOrders(user.id);
  }

  /** List ALL orders — admin only */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  findAllAdmin() {
    return this.orders.findAllOrders();
  }

  /** Order detail — admin only */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  findOneAdmin(@Param('id') id: string) {
    return this.orders.findAdminOrderById(id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.orders.findOwnOrderById(user.id, id);
  }

  /** Delivered content for one order item (anti-IDOR enforced in service). */
  @Get(':id/items/:orderItemId/content')
  @HttpCode(HttpStatus.OK)
  content(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Param('orderItemId') orderItemId: string,
  ) {
    return this.orders.getDecryptedContentForItem(user.id, id, orderItemId);
  }

  /** Cancel/refund an order — admin only */
  @Post('admin/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancelOrder(id, user.id, dto.reason);
  }

  @Patch(':id/payment-note')
  @HttpCode(HttpStatus.OK)
  setNote(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body('paymentNote') paymentNote: string,
  ) {
    return this.orders.setPaymentNote(user.id, id, paymentNote);
  }
}
