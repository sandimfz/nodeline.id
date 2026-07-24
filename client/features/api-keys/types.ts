export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  rateLimitPerMin: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface ApiKeyCreateResponse extends ApiKey {
  fullKey: string;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  recentRequests: number;
  lastUsedAt: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  plan?: "FREE" | "PRO" | "ENTERPRISE";
}
