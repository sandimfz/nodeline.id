import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { and, eq, desc, isNull, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import { apiKeys } from '../../database/drizzle/schema/api-keys.schema.js';
import type { ApiKey } from '../../database/drizzle/schema/api-keys.schema.js';
import type {
  ApiKeyResponseDto,
  ApiKeyListItemDto,
} from './dto/api-key-response.dto.js';

const KEY_PREFIX = 'nl_live_';
const KEY_BYTES = 32; // 256-bit random → 43 base64url chars
const MAX_KEYS_PER_USER = 5;

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Generate a new API key for a user.
   * Full key is returned ONCE and never stored in plaintext.
   */
  async createKey(
    userId: string,
    name: string,
    plan: 'FREE' | 'PRO' | 'ENTERPRISE' = 'FREE',
  ): Promise<ApiKeyResponseDto & { fullKey: string }> {
    // Check active key count
    const [countResult] = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(
        and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)),
      );
    const activeCount = countResult?.count ?? 0;

    if (activeCount >= MAX_KEYS_PER_USER) {
      throw new BadRequestException(
        `Maksimal ${MAX_KEYS_PER_USER} key aktif per user. Revoke key lama terlebih dahulu.`,
      );
    }

    // Generate crypto-secure key
    const randomPart = randomBytes(KEY_BYTES)
      .toString('base64url');
    const fullKey = `${KEY_PREFIX}${randomPart}`;
    const keyPrefix = fullKey.slice(0, 18); // e.g. "nl_live_51H8x•••"

    // Hash with SHA-256
    const hashedKey = this.hashKey(fullKey);

    const planConfig = this.getPlanConfig(plan);

    const [created] = await this.drizzle.db
      .insert(apiKeys)
      .values({
        userId,
        name,
        keyPrefix,
        hashedKey,
        plan,
        rateLimitPerMin: planConfig.rateLimitPerMin,
        allowedSymbols: planConfig.allowedSymbols
          ? planConfig.allowedSymbols.join(',')
          : null,
      })
      .returning();

    this.logger.log(`API key created: ${keyPrefix} (user=${userId}, plan=${plan})`);

    return {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      fullKey,
      plan: created.plan,
      rateLimitPerMin: created.rateLimitPerMin,
      isActive: created.isActive,
      lastUsedAt: created.lastUsedAt,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
  }

  /**
   * List all active (non-revoked) keys for a user.
   * Never reveals full key.
   */
  async listKeys(userId: string): Promise<ApiKeyListItemDto[]> {
    const rows = await this.drizzle.db
      .select()
      .from(apiKeys)
      .where(
        and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)),
      )
      .orderBy(desc(apiKeys.createdAt));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      keyPrefix: r.keyPrefix,
      plan: r.plan,
      rateLimitPerMin: r.rateLimitPerMin,
      isActive: r.isActive,
      lastUsedAt: r.lastUsedAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      revokedAt: r.revokedAt,
    }));
  }

  /**
   * Revoke an API key.
   */
  async revokeKey(keyId: string, userId: string): Promise<void> {
    const [key] = await this.drizzle.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
      .limit(1);

    if (!key) {
      throw new NotFoundException('API key tidak ditemukan');
    }

    await this.drizzle.db
      .update(apiKeys)
      .set({ revokedAt: new Date(), isActive: false })
      .where(eq(apiKeys.id, keyId));

    this.logger.log(`API key revoked: ${key.keyPrefix} (user=${userId})`);
  }

  /**
   * Validate an API key by hashing the input and comparing against stored hash.
   * Uses constant-time comparison to prevent timing attacks.
   * Returns the key record if valid, null otherwise.
   */
  async validateKey(inputKey: string): Promise<ApiKey | null> {
    if (!inputKey.startsWith(KEY_PREFIX)) return null;

    const inputHash = this.hashKey(inputKey);

    // Fetch all active keys
    const keys = await this.drizzle.db
      .select()
      .from(apiKeys)
      .where(
        and(eq(apiKeys.isActive, true), isNull(apiKeys.revokedAt)),
      );

    for (const key of keys) {
      const storedHash = Buffer.from(key.hashedKey, 'hex');
      const computedHash = Buffer.from(inputHash, 'hex');

      if (
        storedHash.length === computedHash.length &&
        timingSafeEqual(storedHash, computedHash)
      ) {
        // Check expiry
        if (key.expiresAt && key.expiresAt < new Date()) {
          return null;
        }

        // Update lastUsedAt (fire-and-forget)
        this.drizzle.db
          .update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, key.id))
          .catch(() => {});

        return key;
      }
    }

    return null;
  }

  /**
   * Get usage statistics for a key.
   */
  async getUsageStats(
    keyId: string,
    userId: string,
  ): Promise<{
    totalRequests: number;
    recentRequests: number;
    lastUsedAt: Date | null;
  }> {
    const [key] = await this.drizzle.db
      .select({ lastUsedAt: apiKeys.lastUsedAt })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
      .limit(1);

    if (!key) {
      throw new NotFoundException('API key tidak ditemukan');
    }

    // Query from usage logs using drizzle sql template
    const totalResult = await this.drizzle.db.execute(
      sql`SELECT count(*)::int as count FROM api_usage_logs WHERE api_key_id = ${keyId}`,
    );

    const recentResult = await this.drizzle.db.execute(
      sql`SELECT count(*)::int as count FROM api_usage_logs
          WHERE api_key_id = ${keyId} AND created_at > NOW() - INTERVAL '1 hour'`,
    );

    const totalRows = totalResult.rows as Array<{ count: number }> | undefined;
    const recentRows = recentResult.rows as Array<{ count: number }> | undefined;

    return {
      totalRequests: totalRows?.[0]?.count ?? 0,
      recentRequests: recentRows?.[0]?.count ?? 0,
      lastUsedAt: key.lastUsedAt,
    };
  }

  // ── Private Helpers ──

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private getPlanConfig(plan: string): {
    rateLimitPerMin: number;
    allowedSymbols: string[] | null;
  } {
    switch (plan) {
      case 'ENTERPRISE':
        return { rateLimitPerMin: 600, allowedSymbols: null };
      case 'PRO':
        return { rateLimitPerMin: 300, allowedSymbols: null };
      case 'FREE':
      default:
        return { rateLimitPerMin: 60, allowedSymbols: null };
    }
  }
}
