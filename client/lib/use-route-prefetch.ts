"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type PrefetchEntry = {
  queryKey: readonly unknown[];
  url: string;
  staleTime: number;
  /**
   * Normalizes the raw API response into the exact shape the page's
   * useQuery expects. Must match that hook's queryFn return value,
   * otherwise the cached entry has the wrong shape and the page crashes
   * (e.g. calling .map() on a paginated wrapper object).
   */
  select?: (raw: unknown) => unknown;
};

/** Unwraps `{ products: [...] }` / plain array into an array. */
function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["products", "services", "data", "items", "keys", "orders"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}

/**
 * Maps a route path to the query it needs, so hovering a nav link
 * can warm the TanStack Query cache before the user clicks.
 *
 * Keys, staleTime, AND response shape must match the page's useQuery.
 */
const routePrefetchMap: Record<string, PrefetchEntry> = {
  "/orders": {
    queryKey: queryKeys.marketplace.orders.all,
    url: "/api/v1/bff/orders",
    staleTime: 10_000,
    select: toArray,
  },
  "/api-keys": {
    queryKey: queryKeys.apiKeys.list,
    url: "/api/v1/bff/api-keys",
    staleTime: 30_000,
    select: toArray,
  },
  "/marketplace": {
    queryKey: queryKeys.marketplace.products.list(),
    url: "/api/v1/bff/products",
    staleTime: 60_000,
    // Page's useQuery returns `data.products ?? data` → an array
    select: toArray,
  },
  "/api-directory": {
    queryKey: queryKeys.apiDirectory.list(),
    url: "/api/v1/bff/api-services?limit=50",
    staleTime: 60_000,
    // Page's useQuery returns the full paginated object, not an array
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

    void queryClient.prefetchQuery({
      queryKey: entry.queryKey,
      queryFn: async () => {
        const res = await fetch(entry.url);
        if (!res.ok) throw new Error("Prefetch failed");
        const raw: unknown = await res.json();
        return entry.select ? entry.select(raw) : raw;
      },
      staleTime: entry.staleTime,
    });
  };
}
