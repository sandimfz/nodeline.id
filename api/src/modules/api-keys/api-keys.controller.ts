import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';

interface AuthedUser {
  id: string;
  role: string;
}

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.createKey(user.id, dto.name, dto.plan);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthedUser) {
    return this.apiKeys.listKeys(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.apiKeys.revokeKey(id, user.id);
  }

  @Get(':id/usage')
  @HttpCode(HttpStatus.OK)
  usage(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.apiKeys.getUsageStats(id, user.id);
  }
}
