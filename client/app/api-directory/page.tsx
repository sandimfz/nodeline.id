import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { ApiDirectoryPage } from "./api-directory-page";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

export const metadata: Metadata = {
  title: "API Directory",
  description:
    "Katalog API yang bisa langsung dipakai di project kamu — data pasar real-time, forex, saham, dan crypto. Mulai gratis, upgrade kapan saja.",
  alternates: { canonical: "/api-directory" },
  openGraph: {
    type: "website",
    title: "API Directory — Nodeline",
    description:
      "Katalog API untuk project kamu. Data pasar real-time, forex, saham, dan crypto. Mulai gratis.",
    url: "/api-directory",
  },
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

  const data = queryClient.getQueryData<{
    services: Array<{ slug: string; name: string; shortDescription: string | null }>;
  }>(queryKeys.apiDirectory.list());
  const services = data?.services ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "API Directory Nodeline",
    description: "Katalog API yang bisa dipakai di project kamu",
    url: `${SITE_URL}/api-directory`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: services.length,
      itemListElement: services.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "WebAPI",
          name: s.name,
          ...(s.shortDescription ? { description: s.shortDescription } : {}),
          url: `${SITE_URL}/api-directory/${s.slug}`,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ApiDirectoryPage />
      </HydrationBoundary>
    </>
  );
}
