/**
 * Grouped, validated env access. ConfigModule runs envValidationSchema first,
 * so by the time this runs (and by the time anything injects ConfigService)
 * every value is present and correctly typed.
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),

  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    access: {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    },
    refresh: {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    },
  },

  stock: {
    encryptionKey: process.env.STOCK_ENCRYPTION_KEY,
  },

  refreshCookie: {
    name: process.env.REFRESH_COOKIE_NAME ?? 'nl_refresh',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE ?? 'strict') as
      'strict' | 'lax' | 'none',
  },

  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME ?? 'nodeline-images',
    accountId: process.env.R2_ACCOUNT_ID!,
    publicUrl: process.env.R2_PUBLIC_URL,
    uploadExpiresIn: Number(process.env.R2_UPLOAD_EXPIRES_IN ?? 600),
  },

  marketData: {
    tradingviewWsUrl:
      process.env.TRADINGVIEW_WS_URL ??
      'wss://data.tradingview.com/socket.io/websocket',
    tradingviewScannerUrl:
      process.env.TRADINGVIEW_SCANNER_URL ??
      'https://scanner.tradingview.com/forex/scan',
  },
});
