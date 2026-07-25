import type { Metadata } from "next";
import { ApiDirectoryPage } from "./api-directory-page";

export const metadata: Metadata = {
  title: "API Directory",
  description: "Temukan dan gunakan API untuk project kamu",
};

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

async function fetchServices() {
  try {
    const res = await fetch(`${API_BASE}/api-services?limit=50`, {
      cache: "no-store",
    });
    if (!res.ok) return { services: [], total: 0, page: 1, limit: 50, totalPages: 1 };
    return res.json();
  } catch {
    return { services: [], total: 0, page: 1, limit: 50, totalPages: 1 };
  }
}

export default async function Page() {
  const data = await fetchServices();
  return <ApiDirectoryPage initialData={data} />;
}
