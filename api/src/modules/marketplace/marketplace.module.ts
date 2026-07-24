import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller.js';
import { ProductsAdminController } from './products/products-admin.controller.js';
import { ProductsService } from './products/products.service.js';
import { StockController } from './stock/stock.controller.js';
import { StockService } from './stock/stock.service.js';
import { OrdersController } from './orders/orders.controller.js';
import { OrdersService } from './orders/orders.service.js';
import { PaymentsController } from './payments/payments.controller.js';
import { PaymentsService } from './payments/payments.service.js';
import { AuditLogService } from './audit-logs/audit-logs.service.js';
import { StockCryptoUtil } from '../../common/crypto/stock-crypto.util.js';
import { StorageController } from './storage/storage.controller.js';
import { StorageService } from './storage/storage.service.js';
import { CategoriesController } from './categories/categories.controller.js';
import { CategoriesService } from './categories/categories.service.js';
import { PaymentMethodsController } from './payment-methods/payment-methods.controller.js';
import { PaymentMethodsService } from './payment-methods/payment-methods.service.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [ChatModule],
  controllers: [
    ProductsController,
    ProductsAdminController,
    StockController,
    OrdersController,
    PaymentsController,
    StorageController,
    CategoriesController,
    PaymentMethodsController,
  ],
  providers: [
    ProductsService,
    StockService,
    OrdersService,
    PaymentsService,
    AuditLogService,
    StockCryptoUtil,
    StorageService,
    CategoriesService,
    PaymentMethodsService,
  ],
  exports: [AuditLogService, StorageService],
})
export class MarketplaceModule {}
