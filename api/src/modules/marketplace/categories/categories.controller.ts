import {
  Controller,
  Get,
  Post,
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
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

@Controller()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Public: list all categories */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.categories.findAll();
  }

  /** Admin: create a category */
  @Post('categories/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto.name);
  }

  /** Admin: delete a category */
  @Delete('categories/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.categories.remove(id);
    return { message: 'Kategori dihapus' };
  }
}
