import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { ApiDirectoryPage } from "./api-directory-page";

export const metadata: Metadata = {
  title: "API Directory",
  description: "Temukan dan gunakan API untuk project kamu",
};

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

async function fetchServices() {
  try {
    const res = await fetch(`${API_BASE}/api-services?limit=50`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { services: [], total: 0, page: 1, limit: 50, totalPages: 1 };
    return res.json();
  } catch {
    return { services: [], total: 0, page: 1, limit: 50, totalPages: 1 };
  }
}

export default async function Page() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.apiDirectory.list(),
    queryFn: fetchServices,
    staleTime: 60_000,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiDirectoryPage />
    </HydrationBoundary>
  );
}
