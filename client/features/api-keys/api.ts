import { bffFetch } from "@/lib/api-client";
import type {
  ApiKey,
  ApiKeyCreateResponse,
  ApiKeyUsageStats,
  CreateApiKeyInput,
} from "./types";

/**
 * Create a new API key.
 * POST /api/v1/bff/api-keys → BFF proxies to POST /api/v1/api-keys
 */
export async function createApiKey(data: CreateApiKeyInput): Promise<ApiKeyCreateResponse> {
  return bffFetch<ApiKeyCreateResponse>("/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * List all API keys for the current user.
 * GET /api/v1/bff/api-keys → BFF proxies to GET /api/v1/api-keys
 */
export async function listApiKeys(): Promise<ApiKey[]> {
  return bffFetch<ApiKey[]>("/api-keys");
}

/**
 * Revoke an API key.
 * DELETE /api/v1/bff/api-keys/:id → BFF proxies to DELETE /api/v1/api-keys/:id
 */
export async function revokeApiKey(id: string): Promise<void> {
  return bffFetch<void>(`/api-keys/${id}`, {
    method: "DELETE",
  });
}

/**
 * Get usage stats for an API key.
 * GET /api/v1/bff/api-keys/:id/usage → BFF proxies to GET /api/v1/api-keys/:id/usage
 */
export async function getApiKeyUsage(id: string): Promise<ApiKeyUsageStats> {
  return bffFetch<ApiKeyUsageStats>(`/api-keys/${id}/usage`);
}
