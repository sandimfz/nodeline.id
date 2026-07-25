"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * Maps a route path to the query it needs, so hovering a nav link
 * can warm the TanStack Query cache before the user clicks.
 *
 * Keys and staleTime must match the server prefetch in each page.tsx
 * and the client useQuery in the corresponding hook.
 */
const routePrefetchMap: Record<
  string,
  { queryKey: readonly unknown[]; url: string; staleTime: number }
> = {
  "/orders": {
    queryKey: queryKeys.marketplace.orders.all,
    url: "/api/v1/bff/orders",
    staleTime: 10_000,
  },
  "/api-keys": {
    queryKey: queryKeys.apiKeys.list,
    url: "/api/v1/bff/api-keys",
    staleTime: 30_000,
  },
  "/marketplace": {
    queryKey: queryKeys.marketplace.products.list(),
    url: "/api/v1/bff/products",
    staleTime: 60_000,
  },
  "/api-directory": {
    queryKey: queryKeys.apiDirectory.list(),
    url: "/api/v1/bff/api-services?limit=50",
    staleTime: 60_000,
  },
  "/dashboard/profile": {
    queryKey: queryKeys.auth.me,
    url: "/api/v1/bff/auth/me",
    staleTime: 5 * 60 * 1000,
  },
};

/**
 * Returns a handler that warms the query cache for a given route.
 * Attach to onMouseEnter/onFocus of nav links.
 */
export function useRoutePrefetch() {
  const queryClient = useQueryClient();

  return (path?: string) => {
    if (!path) return;
    const entry = routePrefetchMap[path];
    if (!entry) return;

    queryClient.prefetchQuery({
      queryKey: entry.queryKey,
      queryFn: async () => {
        const res = await fetch(entry.url);
        if (!res.ok) throw new Error("Prefetch failed");
        const data = await res.json();
        // Normalize paginated shapes to match what the page's useQuery expects
        return data;
      },
      staleTime: entry.staleTime,
    });
  };
}
