import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { QueryProductsDto } from './dto/query-products.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /**
   * Public catalog — no auth required. Only active products returned.
   * Supports pagination, search (by name), category filter, and sorting.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  findCatalog(@Query() query: QueryProductsDto) {
    return this.products.findPublicCatalog(query);
  }

  /** Public product detail. */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findPublicById(id);
  }
}
