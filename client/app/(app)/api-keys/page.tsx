import type { Metadata } from "next";
import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { SESSION_COOKIE } from "@/lib/bff-server";
import ApiKeysContent from "./api-keys-content";

export const metadata: Metadata = {
  title: "API Keys",
};

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

async function fetchApiKeysServer(sessionToken: string) {
  try {
    const res = await fetch(`${API_BASE}/api-keys`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ApiKeysPageWrapper() {
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.apiKeys.list,
      queryFn: () => fetchApiKeysServer(sessionToken),
      staleTime: 30_000,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiKeysContent />
    </HydrationBoundary>
  );
}
