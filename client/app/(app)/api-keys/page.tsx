import type { Metadata } from "next";
import ApiKeysContent from "./api-keys-content";

export const metadata: Metadata = {
  title: "API Keys",
};

/**
 * Client-only page. Data comes from the TanStack Query cache which is warmed
 * by prefetch-on-hover from nav links (see lib/use-route-prefetch.ts).
 *
 * We deliberately avoid server-side prefetch here: reading cookies() would
 * make this route dynamic, which blocks Next.js from prefetching the RSC
 * payload on <Link> hover — causing loading.tsx to show on every navigation
 * even for previously visited pages.
 */
export default function ApiKeysPage() {
  return <ApiKeysContent />;
}
