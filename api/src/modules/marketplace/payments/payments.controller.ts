import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto.js';

interface GodUser {
  id: string;
  role: string;
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('god')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Admin confirms a manual payment → triggers auto-assign of stock units. */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@CurrentUser() user: GodUser, @Body() dto: ConfirmPaymentDto) {
    return this.payments.confirmPayment(dto.orderId, user.id);
  }
}
