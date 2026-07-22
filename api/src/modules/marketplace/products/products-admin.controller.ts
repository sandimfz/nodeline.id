import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { ProductsService } from './products.service.js';
import { StockService } from '../stock/stock.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { RestockTextDto, ManualUnitDto } from './dto/restock.dto.js';

interface GodUser {
  id: string;
  role: string;
}

@Controller('products/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('god')
export class ProductsAdminController {
  constructor(
    private readonly products: ProductsService,
    private readonly stock: StockService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: GodUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.products.remove(id);
    return { message: 'Produk dihapus' };
  }

  /** List pending orders that contain this product (PENDING / PAID_PENDING_FULFILLMENT). */
  @Get(':id/pending-orders')
  @HttpCode(HttpStatus.OK)
  findPendingOrders(@Param('id') id: string) {
    return this.products.findPendingOrders(id);
  }

  /** Restock a product from a pasted .txt body (chunked by keysPerUnit). */
  @Post(':id/restock')
  @HttpCode(HttpStatus.CREATED)
  restock(
    @CurrentUser() user: GodUser,
    @Param('id') id: string,
    @Body() dto: RestockTextDto,
  ) {
    return this.stock.restockFromText(id, dto.content, user.id);
  }

  /** List all stock units with decrypted content (admin inventory view). */
  @Get(':id/stock-units')
  @HttpCode(HttpStatus.OK)
  findStockUnits(@Param('id') id: string) {
    return this.stock.findStockUnits(id);
  }

  /** Add a single unit by hand. */
  @Post(':id/restock/manual')
  @HttpCode(HttpStatus.CREATED)
  addManualUnit(
    @CurrentUser() user: GodUser,
    @Param('id') id: string,
    @Body() dto: ManualUnitDto,
  ) {
    return this.stock.addManualUnit(id, dto.content, user.id);
  }
}
