export class ApiKeyResponseDto {
  id: string;
  name: string;
  keyPrefix: string;
  /** Full plaintext key — only returned ONCE on creation. */
  fullKey?: string;
  plan: string;
  rateLimitPerMin: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export class ApiKeyListItemDto {
  id: string;
  name: string;
  keyPrefix: string;
  plan: string;
  rateLimitPerMin: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}
