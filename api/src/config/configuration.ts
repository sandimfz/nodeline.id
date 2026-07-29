/**
 * Grouped, validated env access. ConfigModule runs envValidationSchema first,
 * so by the time this runs (and by the time anything injects ConfigService)
 * every value is present and correctly typed.
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),

  cors: {
    origins: [], // Diambil via config.get('CORS_ORIGINS') — Zod validate sudah transform ke array
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

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
    redirectBase: process.env.OAUTH_REDIRECT_BASE ?? 'http://localhost:3001',
  },

  thirdParty: {
    giphy: process.env.GIPHY_API_KEY ?? '',
    openweather: process.env.OPENWEATHERMAP_API_KEY ?? '',
    exchangeRates: process.env.EXCHANGE_RATES_API_KEY ?? '',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
});
