import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { ApiServiceDetailPage } from "./service-detail";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

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

  if (!service) {
    return { title: "API Not Found", robots: { index: false } };
  }

  const description: string =
    service.shortDescription ??
    service.description ??
    `Dokumentasi dan pricing ${service.name} di Nodeline API Directory.`;

  return {
    title: service.name,
    description,
    alternates: { canonical: `/api-directory/${slug}` },
    openGraph: {
      type: "website",
      title: `${service.name} — Nodeline API Directory`,
      description,
      url: `/api-directory/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.name} — Nodeline`,
      description,
    },
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

  const plans: Array<{ name: string; priceCents: number }> = service.plans ?? [];
  const cheapest = plans.reduce<number | null>(
    (min, p) => (min === null || p.priceCents < min ? p.priceCents : min),
    null,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: service.name,
    description: service.shortDescription ?? service.description ?? undefined,
    url: `${SITE_URL}/api-directory/${slug}`,
    documentation: `${SITE_URL}/api-directory/${slug}`,
    provider: { "@type": "Organization", name: "Nodeline", url: SITE_URL },
    ...(service.baseUrl ? { termsOfService: service.baseUrl } : {}),
    ...(cheapest !== null
      ? {
          offers: {
            "@type": "Offer",
            price: cheapest,
            priceCurrency: "IDR",
            availability:
              service.status === "ACTIVE"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "API Directory",
        item: `${SITE_URL}/api-directory`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.name,
        item: `${SITE_URL}/api-directory/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ApiServiceDetailPage slug={slug} />
      </HydrationBoundary>
    </>
  );
}
