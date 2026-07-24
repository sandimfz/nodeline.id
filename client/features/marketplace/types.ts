export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string | null;
  priceCents: number;
  keysPerUnit: number;
  isActive: boolean;
  imageUrl: string | null;
  stockStatus: "AVAILABLE" | "OUT_OF_STOCK";
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "PENDING_PAYMENT_CONFIRMATION"
  | "PAID_PENDING_FULFILLMENT"
  | "FULFILLED"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "CANCELLED";

export interface Order {
  id: string;
  buyerId: string;
  whatsappNumber: string;
  status: OrderStatus;
  totalCents: number;
  paymentNote: string | null;
  cancellationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  priceCents: number;
  hasContent: boolean;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

export interface CheckoutInput {
  whatsappNumber: string;
  paymentNote?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface ContentResponse {
  content: string;
}

export interface UploadResponse {
  url: string;
  originalSize: number;
  compressedSize: number;
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
