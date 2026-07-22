import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Public catalog — no auth required. Only active products returned. */
  @Get()
  @HttpCode(HttpStatus.OK)
  findCatalog() {
    return this.products.findPublicCatalog();
  }

  /** Public product detail. */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findPublicById(id);
  }
}
