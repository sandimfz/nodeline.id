import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchProduct,
  checkoutOrder,
  fetchOrders,
  fetchOrderDetail,
  fetchOrderItemContent,
  updatePaymentNote,
  uploadPaymentProof,
  fetchPaymentMethods,
} from "./api";
import type { CheckoutInput } from "./types";

/** Get single product by id */
export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.marketplace.products.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Checkout mutation */
export function useCheckout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckoutInput) => checkoutOrder(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.orders.all });
      router.push(`/orders/${order.id}`);
    },
  });
}

/** Get own orders */
export function useOrders() {
  return useQuery({
    queryKey: queryKeys.marketplace.orders.all,
    queryFn: fetchOrders,
    refetchInterval: 15_000,
  });
}

/** Get order detail */
export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.marketplace.orders.detail(id),
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

/** Get order item content */
export function useOrderItemContent(
  orderId: string,
  orderItemId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...queryKeys.marketplace.orders.detail(orderId), "content", orderItemId],
    queryFn: () => fetchOrderItemContent(orderId, orderItemId),
    enabled,
    retry: false,
    staleTime: Infinity,
  });
}

/** Update payment note mutation */
export function useUpdatePaymentNote(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentNote: string) => updatePaymentNote(orderId, paymentNote),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.marketplace.orders.detail(orderId),
      });
    },
  });
}

/** Get active payment methods */
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.marketplace.paymentMethods.all,
    queryFn: fetchPaymentMethods,
    staleTime: 60_000,
  });
}

/** Upload payment proof mutation */
export function useUploadPaymentProof() {
  return useMutation({
    mutationFn: (params: { file: File; orderId?: string }) =>
      uploadPaymentProof(params.file, params.orderId),
  });
}
