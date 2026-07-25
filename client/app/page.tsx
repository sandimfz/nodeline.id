import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/layout/hero";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

export const metadata: Metadata = {
  title: "Beranda",
  alternates: { canonical: "/" },
};

export default function Home() {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nodeline",
    url: SITE_URL,
    description:
      "Marketplace produk digital dan API Directory untuk kebutuhan project.",
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nodeline",
    url: SITE_URL,
    inLanguage: "id-ID",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/marketplace?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <Header />
      <Hero />
      <Footer />
    </>
  );
}
