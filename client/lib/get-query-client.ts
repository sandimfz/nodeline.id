import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Returns a single QueryClient instance per HTTP request (server-side).
 * Uses React's `cache()` to deduplicate across the same render pass.
 *
 * This is used by Server Components (e.g. layouts, pages) to prefetch
 * data before sending HTML to the client. The dehydrated state is then
 * passed to the client-side `HydrationBoundary`.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    }),
);
