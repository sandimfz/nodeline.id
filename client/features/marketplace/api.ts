import { bffFetch } from "@/lib/api-client";
import type {
  Product,
  Order,
  OrderDetail,
  CheckoutInput,
  ContentResponse,
  UploadResponse,
} from "./types";

/** Get single product by id (public) */
export async function fetchProduct(id: string): Promise<Product> {
  return bffFetch<Product>(`/products/${id}`);
}

/** Checkout — create an order (requires login) */
export async function checkoutOrder(data: CheckoutInput): Promise<Order> {
  return bffFetch<Order>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Get own order history (requires login) */
export async function fetchOrders(): Promise<Order[]> {
  return bffFetch<Order[]>("/orders");
}

/** Get order detail with items (requires login) */
export async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  return bffFetch<OrderDetail>(`/orders/${id}`);
}

/** Get decrypted content for a fulfilled order item (requires login) */
export async function fetchOrderItemContent(
  orderId: string,
  orderItemId: string,
): Promise<ContentResponse> {
  return bffFetch<ContentResponse>(
    `/orders/${orderId}/items/${orderItemId}/content`,
  );
}

/** Update payment note (requires login) */
export async function updatePaymentNote(
  orderId: string,
  paymentNote: string,
): Promise<{ message: string }> {
  return bffFetch<{ message: string }>(`/orders/${orderId}/payment-note`, {
    method: "PATCH",
    body: JSON.stringify({ paymentNote }),
  });
}

/** Upload payment proof image (requires login) */
export async function uploadPaymentProof(
  file: File,
  orderId?: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "payment-proof");
  if (orderId) formData.append("orderId", orderId);

  return bffFetch<UploadResponse>("/storage/upload", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set Content-Type for multipart
  });
}
