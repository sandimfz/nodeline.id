export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string | null;
  priceCents: number;
  keysPerUnit: number;
  isActive: boolean;
  warrantyPeriodDays: number | null;
  maxWarrantyClaims: number | null;
  lowStockThreshold: number;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  createdAt: string;
  updatedAt: string;
  stockStatus?: "AVAILABLE" | "OUT_OF_STOCK";
}

export interface CreateProductInput {
  name: string;
  description?: string;
  priceCents: number;
  keysPerUnit: number;
  isActive?: boolean;
  warrantyPeriodDays?: number;
  maxWarrantyClaims?: number;
  imageUrl?: string;
  categoryId?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  priceCents?: number;
  keysPerUnit?: number;
  isActive?: boolean;
  warrantyPeriodDays?: number | null;
  maxWarrantyClaims?: number | null;
  imageUrl?: string | null;
  categoryId?: string | null;
}

export interface PendingOrder {
  orderId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  status: "PENDING_PAYMENT_CONFIRMATION" | "PAID_PENDING_FULFILLMENT";
  totalCents: number;
  whatsappNumber: string;
  paymentNote: string | null;
  quantity: number;
  createdAt: string;
}

export interface PaymentConfirmResponse {
  status: "FULFILLED" | "PAID_PENDING_FULFILLMENT";
}

export interface RestockResponse {
  inserted: number;
}

export interface AdminOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  totalCents: number;
  whatsappNumber: string;
  paymentNote: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  priceCents: number;
  fulfilled: boolean;
  stockUnitIds: string[];
}

export interface AdminOrderDetail {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  totalCents: number;
  whatsappNumber: string;
  paymentNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
}

export interface UploadImageResponse {
  url: string;
  originalSize: number;
  compressedSize: number;
}

export interface StockAssignInput {
  orderItemId: string;
  stockUnitId: string;
}

export interface ConfirmPaymentInput {
  orderId: string;
}

export interface CancelOrderResponse {
  status: "CANCELLED" | "REFUNDED";
  reason?: string;
}

export interface RestockInput {
  content: string;
}

export interface ManualRestockInput {
  content: string;
}

export interface PaymentMethod {
  id: string;
  type: "bank_transfer" | "qris";
  name: string;
  imageUrl: string;
  accountNumber: string | null;
  accountName: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodInput {
  type: "bank_transfer" | "qris";
  name: string;
  imageUrl: string;
  accountNumber?: string;
  accountName?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePaymentMethodInput extends Partial<CreatePaymentMethodInput> {
  id: string;
}

export interface StockUnit {
  id: string;
  content: string;
  status: "AVAILABLE" | "SOLD";
  createdAt: string;
  soldAt: string | null;
}
