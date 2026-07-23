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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { PaymentMethodsService } from './payment-methods.service.js';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto.js';

@Controller()
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  /** Public: list active payment methods */
  @Get('payment-methods')
  @HttpCode(HttpStatus.OK)
  findActive() {
    return this.paymentMethods.findActive();
  }

  /** Admin: list all payment methods */
  @Get('payment-methods/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.paymentMethods.findAll();
  }

  /** Admin: create a payment method */
  @Post('payment-methods/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethods.create(dto);
  }

  /** Admin: update a payment method */
  @Patch('payment-methods/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.paymentMethods.update(id, dto);
  }

  /** Admin: delete a payment method */
  @Delete('payment-methods/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.paymentMethods.remove(id);
    return { message: 'Metode pembayaran dihapus' };
  }
}
