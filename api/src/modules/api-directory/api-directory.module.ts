import { Module } from '@nestjs/common';
import { ApiDirectoryController } from './api-directory.controller.js';
import { ApiDirectoryAdminController } from './api-directory-admin.controller.js';
import { ApiDirectoryService } from './api-directory.service.js';

@Module({
  controllers: [ApiDirectoryAdminController, ApiDirectoryController],
  providers: [ApiDirectoryService],
  exports: [ApiDirectoryService],
})
export class ApiDirectoryModule {}
