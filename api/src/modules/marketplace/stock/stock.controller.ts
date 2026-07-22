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
import { StockService } from './stock.service.js';
import { ManualAssignDto } from './dto/manual-assign.dto.js';

interface GodUser {
  id: string;
  role: string;
}

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('god')
export class StockController {
  constructor(private readonly stock: StockService) {}

  /** Admin override: assign a specific unit to a specific order item. */
  @Post('assign')
  @HttpCode(HttpStatus.OK)
  async assign(@CurrentUser() user: GodUser, @Body() dto: ManualAssignDto) {
    await this.stock.manualAssign(
      dto.orderItemId,
      dto.stockUnitId,
      user.id,
      null,
    );
    return { message: 'Stock unit di-assign' };
  }
}
