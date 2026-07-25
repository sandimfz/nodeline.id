import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchProductServer } from "@/lib/bff-server";
import { ProductDetailPage } from "./product-detail";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * React cache() deduplicates the fetch between generateMetadata and the page
 * component, which otherwise each trigger their own request.
 */
const getProduct = cache(async (id: string) => fetchProductServer(id));

function truncate(text: string, max = 158): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: "Produk Tidak Ditemukan", robots: { index: false } };
  }

  const price = `Rp ${product.priceCents.toLocaleString("id-ID")}`;
  const description = truncate(
    product.description
      ? `${product.description} — ${price}`
      : `${product.name} tersedia di Nodeline seharga ${price}.`,
  );

  return {
    title: product.name,
    description,
    alternates: { canonical: `/marketplace/${id}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/marketplace/${id}`,
      ...(product.imageUrl
        ? { images: [{ url: product.imageUrl, width: 1200, height: 630, alt: product.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
    },
  };
}

export default async function ProductDetail({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/marketplace/${id}`,
      price: product.priceCents,
      priceCurrency: "IDR",
      availability:
        product.stockStatus === "AVAILABLE"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Nodeline" },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Marketplace",
        item: `${SITE_URL}/marketplace`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${SITE_URL}/marketplace/${id}`,
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
      <ProductDetailPage product={product} />
    </>
  );
}
