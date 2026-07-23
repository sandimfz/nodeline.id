import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchPendingOrders,
  fetchStockUnits,
  fetchAllOrders,
  fetchAdminOrderDetail,
  restockProduct,
  restockManual,
  uploadProductImage,
  manualAssignStock,
  confirmPayment,
  fetchCategories,
  createCategory,
  deleteCategory,
} from "./api";
import {
  fetchPaymentMethods,
  createPaymentMethod as createPaymentMethodApi,
  updatePaymentMethod as updatePaymentMethodApi,
  deletePaymentMethod as deletePaymentMethodApi,
  uploadPaymentImage as uploadPaymentImageApi,
} from "./api";
import type {
  CreateProductInput,
  UpdateProductInput,
  RestockInput,
  ManualRestockInput,
  ConfirmPaymentInput,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "./types";

/** Get all categories */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: fetchCategories,
    staleTime: 60_000,
  });
}

/** Create category mutation */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/** Delete category mutation */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}


/** Get all products */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: fetchProducts,
    staleTime: 30_000,
  });
}

/** Get single product by id */
export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Get pending orders for a product */
export function usePendingOrders(productId: string) {
  return useQuery({
    queryKey: queryKeys.orders.pendingByProduct(productId),
    queryFn: () => fetchPendingOrders(productId),
    enabled: !!productId,
    refetchInterval: 10_000,
  });
}

/** Create product mutation */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/** Update product mutation */
export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProductInput) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
    },
  });
}

/** Delete product mutation */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/** Restock product mutation */
export function useRestockProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RestockInput) => restockProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
    },
  });
}

/** Manual restock mutation */
export function useManualRestock(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ManualRestockInput) => restockManual(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
    },
  });
}

/** Get stock units for a product */
export function useStockUnits(productId: string) {
  return useQuery({
    queryKey: queryKeys.stockUnits.byProduct(productId),
    queryFn: () => fetchStockUnits(productId),
    enabled: !!productId,
    refetchInterval: 15_000,
  });
}

/** Upload product image mutation */
export function useUploadProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProductImage(file, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(productId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/** Get ALL orders (admin only) */
export function useAllOrders() {
  return useQuery({
    queryKey: queryKeys.orders.allList,
    queryFn: fetchAllOrders,
    refetchInterval: 15_000,
  });
}

/** Get order detail (admin only) */
export function useAdminOrderDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.adminDetail(id),
    queryFn: () => fetchAdminOrderDetail(id),
    enabled: !!id,
  });
}

/** Manual stock assign mutation */
export function useManualAssignStock(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderItemId: string; stockUnitId: string }) =>
      manualAssignStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.adminDetail(orderId),
      });
    },
  });
}

/** Get all payment methods (admin) */
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.all,
    queryFn: fetchPaymentMethods,
    staleTime: 30_000,
  });
}

/** Create payment method mutation */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentMethodInput) =>
      createPaymentMethodApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all,
      });
    },
  });
}

/** Update payment method mutation */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePaymentMethodInput) => {
      const { id, ...rest } = data;
      return updatePaymentMethodApi(id, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all,
      });
    },
  });
}

/** Delete payment method mutation */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethodApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all,
      });
    },
  });
}

/** Upload payment method image */
export function useUploadPaymentImage() {
  return useMutation({
    mutationFn: (file: File) => uploadPaymentImageApi(file),
  });
}

/** Confirm payment mutation */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfirmPaymentInput) => confirmPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
