import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

/**
 * Rendered per request. OpenNext on Cloudflare has no incremental cache
 * configured, so an ISR-cached sitemap has nowhere to live and 404s in
 * production. The upstream calls are cheap and go through the BFF edge cache
 * anyway.
 */
export const dynamic = "force-dynamic";

type ProductEntry = { id: string; updatedAt: string };
type ServiceEntry = { slug: string; updatedAt: string };

/**
 * The API caps `limit` at 100 — a larger value returns 400 and the sitemap
 * silently loses all product entries. If the catalog outgrows 100 items,
 * paginate here rather than raising the limit.
 */
const MAX_PAGE_SIZE = 100;

async function fetchProducts(): Promise<ProductEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/products?limit=${MAX_PAGE_SIZE}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products ?? data ?? []) as ProductEntry[];
  } catch {
    return [];
  }
}

async function fetchServices(): Promise<ServiceEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/api-services?limit=${MAX_PAGE_SIZE}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.services ?? []) as ServiceEntry[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch in parallel — a sequential await would make sitemap generation
  // twice as slow for no reason.
  const [products, services] = await Promise.all([
    fetchProducts(),
    fetchServices(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1.0,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/marketplace`,
      changeFrequency: "daily",
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/api-directory`,
      changeFrequency: "weekly",
      priority: 0.9,
      lastModified: new Date(),
    },
  ];

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/marketplace/${p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const serviceEntries: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${SITE_URL}/api-directory/${s.slug}`,
    lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries, ...serviceEntries];
}
