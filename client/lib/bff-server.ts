import type { User } from "@/features/auth/types";

/**
 * Server-side fetch helper used by Server Components (layouts, pages).
 *
 * Instead of going through the BFF proxy (which is designed for browser
 * requests with cookie forwarding), this reads the session cookie value
 * directly and calls the NestJS backend with the JWT as an Authorization
 * header.
 *
 * This is used for prefetching data during SSR so the client doesn't
 * see a flash of "guest" state before the session check completes.
 */

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "nl_session";

/**
 * Fetch the current user from the NestJS backend using a JWT access token.
 * Returns `null` if the token is missing, expired, or invalid (so the
 * caller can safely handle guest state without try/catch).
 */
export async function fetchMeServer(
  sessionToken: string | undefined,
): Promise<User | null> {
  if (!sessionToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      // In Next.js 16 server-side fetch, we want fresh data each time
      cache: "no-store",
    });

    if (!res.ok) return null;

    return (await res.json()) as User;
  } catch {
    // Backend unavailable — treat as guest
    return null;
  }
}

/**
 * Fetch all active products (public) from the NestJS backend.
 * No auth required — this is the public catalog endpoint.
 * Returns paginated result with products array, total count, page, limit, and totalPages.
 */
export async function fetchProductsServer(options?: {
  search?: string;
  categoryId?: string;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    sellerId: string;
    name: string;
    description: string | null;
    priceCents: number;
    keysPerUnit: number;
    isActive: boolean;
    imageUrl: string | null;
    stockStatus: "AVAILABLE" | "OUT_OF_STOCK";
    categoryName: string | null;
    createdAt: string;
    updatedAt: string;
  }>
> {
  try {
    const params = new URLSearchParams();
    if (options?.search) params.set('search', options.search);
    if (options?.categoryId) params.set('categoryId', options.categoryId);
    if (options?.sortBy) params.set('sortBy', options.sortBy);
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    const url = `${API_BASE}/products${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // New paginated format: { products: [...], total, page, limit, totalPages }
    return data.products ?? data;
  } catch {
    return [];
  }
}

/**
 * Fetch a single product by id (server-side, public).
 */
export async function fetchProductServer(
  id: string,
): Promise<{
  id: string;
  sellerId: string;
  name: string;
  description: string | null;
  priceCents: number;
  keysPerUnit: number;
  isActive: boolean;
  imageUrl: string | null;
  stockStatus: "AVAILABLE" | "OUT_OF_STOCK";
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
