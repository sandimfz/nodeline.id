import api from "@/lib/api-client";
import type {
  Product,
  Category,
  CreateProductInput,
  UpdateProductInput,
  PendingOrder,
  PaymentConfirmResponse,
  RestockResponse,
  ConfirmPaymentInput,
  RestockInput,
  ManualRestockInput,
  StockUnit,
  UploadImageResponse,
  AdminOrder,
  AdminOrderDetail,
  PaymentMethod,
  CreatePaymentMethodInput,
} from "./types";

/** Get all active products (public catalog) */
export async function fetchProducts(): Promise<Product[]> {
  const res = await api.get<Product[]>("/products");
  return res.data;
}

/** Get single product by id (admin uses public detail) */
export async function fetchProduct(id: string): Promise<Product> {
  const res = await api.get<Product>(`/products/${id}`);
  return res.data;
}

/** Create a new product (god only) */
export async function createProduct(
  data: CreateProductInput,
): Promise<Product> {
  const res = await api.post<Product>("/products/admin", data);
  return res.data;
}

/** Update a product (god only) */
export async function updateProduct(
  id: string,
  data: UpdateProductInput,
): Promise<Product> {
  const res = await api.patch<Product>(`/products/admin/${id}`, data);
  return res.data;
}

/** Delete a product (god only) */
export async function deleteProduct(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/products/admin/${id}`);
  return res.data;
}

/** Get pending orders for a product (god only) */
export async function fetchPendingOrders(
  productId: string,
): Promise<PendingOrder[]> {
  const res = await api.get<PendingOrder[]>(
    `/products/admin/${productId}/pending-orders`,
  );
  return res.data;
}

/** Restock a product from text (god only) */
export async function restockProduct(
  id: string,
  data: RestockInput,
): Promise<RestockResponse> {
  const res = await api.post<RestockResponse>(
    `/products/admin/${id}/restock`,
    data,
  );
  return res.data;
}

/** Add a single manual unit (god only) */
export async function restockManual(
  id: string,
  data: ManualRestockInput,
): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>(
    `/products/admin/${id}/restock/manual`,
    data,
  );
  return res.data;
}

/** Get all stock units (decrypted content) for a product (god only) */
export async function fetchStockUnits(
  productId: string,
): Promise<StockUnit[]> {
  const res = await api.get<StockUnit[]>(
    `/products/admin/${productId}/stock-units`,
  );
  return res.data;
}

/** Get ALL orders (admin only) */
export async function fetchAllOrders(): Promise<AdminOrder[]> {
  const res = await api.get<AdminOrder[]>("/orders/admin/all");
  return res.data;
}

/** Get order detail (admin only) */
export async function fetchAdminOrderDetail(
  id: string,
): Promise<AdminOrderDetail> {
  const res = await api.get<AdminOrderDetail>(`/orders/admin/${id}`);
  return res.data;
}

/** Upload a product image (multipart/form-data) */
export async function uploadProductImage(
  file: File,
  productId: string,
): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "product-image");
  formData.append("productId", productId);

  const res = await api.post<UploadImageResponse>("/storage/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** Manual assign: assign a specific stock unit to an order item (god only) */
export async function manualAssignStock(data: {
  orderItemId: string;
  stockUnitId: string;
}): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/stock/assign", data);
  return res.data;
}

/** Confirm payment for an order (god only) */
export async function confirmPayment(
  data: ConfirmPaymentInput,
): Promise<PaymentConfirmResponse> {
  const res = await api.post<PaymentConfirmResponse>("/payments/confirm", data);
  return res.data;
}

/** Get all payment methods (admin) */
export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await api.get<PaymentMethod[]>("/payment-methods/admin");
  return res.data;
}

/** Create a payment method (god only) */
export async function createPaymentMethod(
  data: CreatePaymentMethodInput,
): Promise<PaymentMethod> {
  const res = await api.post<PaymentMethod>("/payment-methods/admin", data);
  return res.data;
}

/** Update a payment method (god only) */
export async function updatePaymentMethod(
  id: string,
  data: Partial<CreatePaymentMethodInput>,
): Promise<PaymentMethod> {
  const res = await api.patch<PaymentMethod>(
    `/payment-methods/admin/${id}`,
    data,
  );
  return res.data;
}

/** Delete a payment method (god only) */
export async function deletePaymentMethod(
  id: string,
): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(
    `/payment-methods/admin/${id}`,
  );
  return res.data;
}

/** Upload payment method image */
export async function uploadPaymentImage(
  file: File,
): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "product-image");

  const res = await api.post<UploadImageResponse>("/storage/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** Get all categories */
export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<Category[]>("/categories");
  return res.data;
}

/** Create a category (god only) */
export async function createCategory(
  data: { name: string },
): Promise<Category> {
  const res = await api.post<Category>("/categories/admin", data);
  return res.data;
}

/** Delete a category (god only) */
export async function deleteCategory(
  id: string,
): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/categories/admin/${id}`);
  return res.data;
}
