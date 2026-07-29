import { z } from 'zod';

/**
 * Env validation schema. Loaded by ConfigModule; the app refuses to boot
 * (ConfigModule throws) if any required var is missing or malformed — we never
 * run with a half-configured env (e.g. empty JWT secret).
 */
export const envValidationSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().min(1).url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  REFRESH_COOKIE_NAME: z.string().default('nl_refresh'),
  STOCK_ENCRYPTION_KEY: z
    .string()
    .length(64, 'STOCK_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  COOKIE_SECURE: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .default(false),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  // Market Data
  TRADINGVIEW_WS_URL: z.string().default('wss://data.tradingview.com/socket.io/websocket'),
  TRADINGVIEW_SCANNER_URL: z.string().default('https://scanner.tradingview.com/forex/scan'),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  OAUTH_REDIRECT_BASE: z.string().default('http://localhost:3001'),

  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('nodeline-images'),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_PUBLIC_URL: z.string().optional(),
  R2_UPLOAD_EXPIRES_IN: z.coerce.number().int().positive().default(600),

  // Third-party API keys (optional — proxy akan fallback jika tidak ada)
  GIPHY_API_KEY: z.string().default(''),
  OPENWEATHERMAP_API_KEY: z.string().default(''),
  EXCHANGE_RATES_API_KEY: z.string().default(''),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
});

export type EnvConfig = z.infer<typeof envValidationSchema>;
