import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Wraps an ioredis client with auto-connect/quit lifecycle.
 *
 * All methods return null when Redis is unavailable so the app
 * degrades gracefully instead of crashing.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('redis.url')!;
    this.logger.log(`Connecting to Redis: ${url}`);
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // give up after 5 retries
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.quit().catch(() => {});
    }
  }

  // ── Generic helpers ──

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {}
  }

  async incr(key: string): Promise<number | null> {
    try {
      return await this.client.incr(key);
    } catch {
      return null;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {}
  }

  async expireAt(key: string, timestamp: number): Promise<void> {
    try {
      await this.client.expireat(key, timestamp);
    } catch {}
  }

  /** Cached GET with SETEX fallback — returns parsed JSON or null. */
  async getCached<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {}
  }
}
