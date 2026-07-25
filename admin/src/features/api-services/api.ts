import api from "@/lib/api-client";

export interface ApiService {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  category: string;
  baseUrl: string;
  logoUrl: string | null;
  pricingType: "FREE" | "FREEMIUM" | "PAID";
  status: "ACTIVE" | "MAINTENANCE" | "DEPRECATED";
  version: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiServiceListResult {
  services: ApiService[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** List all services including unpublished ones (admin only) */
export async function fetchApiServices(): Promise<ApiServiceListResult> {
  const res = await api.get<ApiServiceListResult>("/api-services/admin");
  return res.data;
}

/** Update a service — used for toggling isPublished and status */
export async function updateApiService(
  id: string,
  data: Partial<Pick<ApiService, "isPublished" | "status" | "name" | "shortDescription" | "pricingType">>,
): Promise<ApiService> {
  const res = await api.patch<ApiService>(`/api-services/admin/${id}`, data);
  return res.data;
}

/** Delete a service */
export async function deleteApiService(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/api-services/admin/${id}`);
  return res.data;
}
