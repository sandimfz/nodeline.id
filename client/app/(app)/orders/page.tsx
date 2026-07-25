import type { Metadata } from "next";
import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { SESSION_COOKIE } from "@/lib/bff-server";
import OrdersContent from "./orders-content";

export const metadata: Metadata = {
  title: "Pesanan",
};

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

async function fetchOrdersServer(sessionToken: string) {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function OrdersPageWrapper() {
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.marketplace.orders.all,
      queryFn: () => fetchOrdersServer(sessionToken),
      staleTime: 10_000,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrdersContent />
    </HydrationBoundary>
  );
}
