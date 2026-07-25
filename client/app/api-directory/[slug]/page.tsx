import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { ApiServiceDetailPage } from "./service-detail";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

// React cache() deduplicates between generateMetadata and page component
const fetchService = cache(async (slug: string) => {
  try {
    const res = await fetch(`${API_BASE}/api-services/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await fetchService(slug);
  return {
    title: service?.name ?? "API Not Found",
    description: service?.shortDescription ?? undefined,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await fetchService(slug);
  if (!service) notFound();

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.apiDirectory.detail(slug),
    queryFn: () => service, // already fetched, just seed the cache
    staleTime: 60_000,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiServiceDetailPage slug={slug} />
    </HydrationBoundary>
  );
}
