import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { fetchProductsServer } from "@/lib/bff-server";
import { CardProductShowcasePage } from "@/components/marketplace/card-product";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Katalog produk digital Nodeline — template, kredit, key, dan lisensi. Konten dienkripsi dan dikirim otomatis setelah pembayaran dikonfirmasi.",
  alternates: { canonical: "/marketplace" },
  openGraph: {
    type: "website",
    title: "Marketplace — Nodeline",
    description:
      "Katalog produk digital Nodeline. Konten dienkripsi dan dikirim otomatis setelah pembayaran dikonfirmasi.",
    url: "/marketplace",
  },
};

export default async function Marketplace() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.marketplace.products.list(),
    queryFn: () => fetchProductsServer(),
    staleTime: 60_000,
  });

  // Rendered server-side so crawlers that don't run JS still see the catalog.
  const products = queryClient.getQueryData<
    Array<{ id: string; name: string; priceCents: number; imageUrl: string | null; stockStatus: string }>
  >(queryKeys.marketplace.products.list()) ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Marketplace Nodeline",
    description: "Katalog produk digital Nodeline",
    url: `${SITE_URL}/marketplace`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          url: `${SITE_URL}/marketplace/${p.id}`,
          ...(p.imageUrl ? { image: p.imageUrl } : {}),
          offers: {
            "@type": "Offer",
            price: p.priceCents,
            priceCurrency: "IDR",
            availability:
              p.stockStatus === "AVAILABLE"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
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
        <CardProductShowcasePage />
      </HydrationBoundary>
    </>
  );
}
