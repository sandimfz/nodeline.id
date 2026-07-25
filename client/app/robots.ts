import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // BFF proxy and route handlers
          "/dashboard/", // authenticated area
          "/orders", // authenticated area
          "/orders/",
          "/api-keys", // authenticated area
          "/checkout", // authenticated area
          "/auth/", // login, register, OAuth callbacks
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
