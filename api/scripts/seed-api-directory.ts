/**
 * Seed script: populate API Directory with Trading API entry.
 * Run: node --import tsx --env-file=.env scripts/seed-api-directory.ts
 */
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Trading API service
    const serviceId = randomUUID();
    await client.query(
      `INSERT INTO api_services (id, slug, name, short_description, description, category, base_url, pricing_type, status, version, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         short_description = EXCLUDED.short_description,
         description = EXCLUDED.description,
         base_url = EXCLUDED.base_url,
         pricing_type = EXCLUDED.pricing_type,
         status = EXCLUDED.status,
         is_published = EXCLUDED.is_published,
         updated_at = NOW()`,
      [
        serviceId,
        'trading',
        'Trading API',
        'Real-time forex, crypto, and stock market data',
        'API untuk mendapatkan data pasar real-time termasuk harga forex (EUR/USD, GBP/USD), crypto, saham, dan komoditas (XAU/USD, XAG/USD). Mendukung SSE streaming, OHLC candles, dan market scanner.',
        'trading',
        'https://api.sandimf.dev/api/v1/public',
        'FREEMIUM',
        'ACTIVE',
        'v1',
        true,
        0,
      ],
    );

    // Get actual service ID (in case of upsert)
    const { rows: [svc] } = await client.query(
      `SELECT id FROM api_services WHERE slug = 'trading'`,
    );
    const sId = svc.id;

    // 2. Create plans
    const plans = [
      { name: 'FREE', priceCents: 0, requestsPerDay: 1000, requestsPerMinute: 60, features: ['Real-time prices', 'OHLC candles', 'Market scanner'], sortOrder: 0 },
      { name: 'PRO', priceCents: 9900, requestsPerDay: 50000, requestsPerMinute: 300, features: ['Everything in FREE', 'SSE price stream', 'Priority support', '50x more quota'], sortOrder: 1 },
      { name: 'ENTERPRISE', priceCents: 49900, requestsPerDay: null, requestsPerMinute: 1000, features: ['Everything in PRO', 'Unlimited requests', 'Custom symbols', 'Dedicated support'], sortOrder: 2 },
    ];

    for (const plan of plans) {
      await client.query(
        `INSERT INTO api_plans (id, service_id, name, price_cents, requests_per_day, requests_per_minute, features, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [randomUUID(), sId, plan.name, plan.priceCents, plan.requestsPerDay, plan.requestsPerMinute, JSON.stringify(plan.features), true, plan.sortOrder],
      );
    }

    // 3. Create endpoints
    const endpoints = [
      { method: 'GET', path: '/prices/:symbol', summary: 'Get real-time price for a symbol', isPremium: false, sortOrder: 0 },
      { method: 'GET', path: '/prices/stream', summary: 'SSE stream of real-time prices', isPremium: true, sortOrder: 1 },
      { method: 'GET', path: '/candles', summary: 'Get OHLC candle data', isPremium: false, sortOrder: 2 },
      { method: 'GET', path: '/scanner', summary: 'Market scanner with filters', isPremium: false, sortOrder: 3 },
      { method: 'GET', path: '/symbols', summary: 'List available symbols', isPremium: false, sortOrder: 4 },
    ];

    for (const ep of endpoints) {
      await client.query(
        `INSERT INTO api_endpoints (id, service_id, method, path, summary, is_premium, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [randomUUID(), sId, ep.method, ep.path, ep.summary, ep.isPremium, ep.sortOrder],
      );
    }

    await client.query('COMMIT');
    console.log('✅ API Directory seeded with Trading API');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
