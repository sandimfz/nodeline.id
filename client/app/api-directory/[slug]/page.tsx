import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiServiceDetailPage } from "./service-detail";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

async function fetchService(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api-services/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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
  return <ApiServiceDetailPage service={service} />;
}
