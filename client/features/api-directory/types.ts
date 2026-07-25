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

export interface ApiEndpoint {
  id: string;
  serviceId: string;
  method: string;
  path: string;
  summary: string | null;
  description: string | null;
  requestExample: unknown;
  responseExample: unknown;
  isPremium: boolean;
  sortOrder: number;
}

export interface ApiPlan {
  id: string;
  serviceId: string;
  name: string;
  priceCents: number;
  requestsPerDay: number | null;
  requestsPerMinute: number;
  features: string[] | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ApiServiceDetail extends ApiService {
  endpoints: ApiEndpoint[];
  plans: ApiPlan[];
}

export interface ApiServiceListResult {
  services: ApiService[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
