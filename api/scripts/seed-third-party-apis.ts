/**
 * Seed script: populate API Directory with 4 third-party API entries.
 *
 * APIs seeded:
 *  1. Giphy API          — random GIF, search GIFs (entertainment)
 *  2. ClearLLC Math API  — basic math operations (utility)
 *  3. OpenWeatherMap API — current weather data (weather)
 *  4. Abstract Exchange Rates API — live currency exchange rates (finance)
 *
 * Run: node --import tsx --env-file=.env scripts/seed-third-party-apis.ts
 */
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─────────────────────────────────────────────────────────────────────────────
// Data definitions
// ─────────────────────────────────────────────────────────────────────────────

interface PlanDef {
  name: string;
  priceCents: number;
  requestsPerDay: number | null;
  requestsPerMinute: number;
  features: string[];
  sortOrder: number;
}

interface EndpointDef {
  method: string;
  path: string;
  summary: string;
  description: string;
  requestExample: Record<string, unknown> | null;
  responseExample: Record<string, unknown>;
  isPremium: boolean;
  sortOrder: number;
}

interface ServiceDef {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  baseUrl: string;
  pricingType: 'FREE' | 'FREEMIUM' | 'PAID';
  status: 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';
  version: string;
  isPublished: boolean;
  sortOrder: number;
  plans: PlanDef[];
  endpoints: EndpointDef[];
}

const services: ServiceDef[] = [
  // ──────────────────────────────────────────────────────────────────
  // 1. Giphy API
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'giphy',
    name: 'Giphy API',
    shortDescription: 'Akses jutaan GIF animasi dari database Giphy',
    description:
      'Giphy API memungkinkan kamu mengintegrasikan jutaan GIF animasi ke dalam aplikasi. Endpoint tersedia untuk mendapatkan GIF acak, mencari GIF berdasarkan kata kunci, mendapatkan GIF trending, serta translate teks ke GIF. Cocok untuk aplikasi chat, sosial media, atau hiburan.',
    category: 'entertainment',
    baseUrl: 'https://api.giphy.com/v1',
    pricingType: 'FREEMIUM',
    status: 'ACTIVE',
    version: 'v1',
    isPublished: true,
    sortOrder: 10,
    plans: [
      {
        name: 'FREE',
        priceCents: 0,
        requestsPerDay: 1000,
        requestsPerMinute: 60,
        features: [
          'Random GIF',
          'Search GIFs',
          'Trending GIFs',
          'Public beta key',
        ],
        sortOrder: 0,
      },
      {
        name: 'PRO',
        priceCents: 9900,
        requestsPerDay: 100000,
        requestsPerMinute: 600,
        features: [
          'Everything in FREE',
          '100x more quota',
          'Translate endpoint',
          'Priority support',
        ],
        sortOrder: 1,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/gifs/random',
        summary: 'Dapatkan satu GIF acak',
        description:
          'Mengembalikan satu GIF acak dari seluruh database Giphy. Bisa difilter berdasarkan tag.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            tag: 'funny',
          },
        },
        responseExample: {
          data: {
            type: 'gif',
            id: 'mX119hesRrkncPHGW7',
            url: 'https://giphy.com/gifs/mX119hesRrkncPHGW7',
            title: 'openmarketnyc GIF by Meatpacking District',
            rating: 'g',
            images: {
              original: {
                url: 'https://media.giphy.com/media/mX119hesRrkncPHGW7/giphy.gif',
              },
            },
          },
          meta: { status: 200, msg: 'OK', response_id: 'abc123' },
        },
        isPremium: false,
        sortOrder: 0,
      },
      {
        method: 'GET',
        path: '/gifs/search',
        summary: 'Cari GIF berdasarkan kata kunci',
        description:
          'Mencari GIF di Giphy berdasarkan query string. Mendukung pagination via offset dan limit.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            q: 'cats',
            limit: 10,
            offset: 0,
            rating: 'g',
            lang: 'id',
          },
        },
        responseExample: {
          data: [
            {
              type: 'gif',
              id: 'example123',
              url: 'https://giphy.com/gifs/example123',
              title: 'funny cat GIF',
            },
          ],
          pagination: { total_count: 5000, count: 10, offset: 0 },
          meta: { status: 200, msg: 'OK' },
        },
        isPremium: false,
        sortOrder: 1,
      },
      {
        method: 'GET',
        path: '/gifs/trending',
        summary: 'Dapatkan GIF trending saat ini',
        description:
          'Mengembalikan daftar GIF yang sedang trending di Giphy secara real-time.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            limit: 10,
            rating: 'g',
          },
        },
        responseExample: {
          data: [
            { id: 'trending1', url: 'https://giphy.com/gifs/trending1' },
            { id: 'trending2', url: 'https://giphy.com/gifs/trending2' },
          ],
          pagination: { total_count: 10000, count: 10, offset: 0 },
          meta: { status: 200, msg: 'OK' },
        },
        isPremium: false,
        sortOrder: 2,
      },
      {
        method: 'GET',
        path: '/gifs/translate',
        summary: 'Translate teks ke GIF',
        description:
          'Mengkonversi sebuah kata atau frasa menjadi GIF yang paling relevan menggunakan algoritma Giphy Translate.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            s: 'happy',
          },
        },
        responseExample: {
          data: {
            type: 'gif',
            id: 'translate123',
            url: 'https://giphy.com/gifs/translate123',
            title: 'happy dance GIF',
          },
          meta: { status: 200, msg: 'OK' },
        },
        isPremium: true,
        sortOrder: 3,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // 2. ClearLLC Math API
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'math-api',
    name: 'Math API',
    shortDescription: 'Operasi matematika dasar via REST API',
    description:
      'Math API by ClearLLC menyediakan operasi matematika dasar (tambah, kurang, kali, bagi) melalui REST API. Cocok untuk belajar integrasi API, prototipe, atau use-case ringan yang butuh komputasi server-side.',
    category: 'utility',
    baseUrl: 'https://api.clearllc.com/api/v2/math',
    pricingType: 'FREE',
    status: 'ACTIVE',
    version: 'v2',
    isPublished: true,
    sortOrder: 11,
    plans: [
      {
        name: 'FREE',
        priceCents: 0,
        requestsPerDay: 5000,
        requestsPerMinute: 120,
        features: [
          'Penjumlahan (add)',
          'Pengurangan (subtract)',
          'Perkalian (multiply)',
          'Pembagian (divide)',
        ],
        sortOrder: 0,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/add',
        summary: 'Penjumlahan dua angka',
        description:
          'Menambahkan dua bilangan `n1` dan `n2` dan mengembalikan hasilnya.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            n1: 10,
            n2: 5,
          },
        },
        responseExample: { result: 15 },
        isPremium: false,
        sortOrder: 0,
      },
      {
        method: 'GET',
        path: '/subtract',
        summary: 'Pengurangan dua angka',
        description: 'Mengurangi `n2` dari `n1` dan mengembalikan hasilnya.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            n1: 10,
            n2: 3,
          },
        },
        responseExample: { result: 7 },
        isPremium: false,
        sortOrder: 1,
      },
      {
        method: 'GET',
        path: '/multiply',
        summary: 'Perkalian dua angka',
        description: 'Mengalikan `n1` dengan `n2` dan mengembalikan hasilnya.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            n1: 4,
            n2: 5,
          },
        },
        responseExample: { result: 20 },
        isPremium: false,
        sortOrder: 2,
      },
      {
        method: 'GET',
        path: '/divide',
        summary: 'Pembagian dua angka',
        description:
          'Membagi `n1` dengan `n2` dan mengembalikan hasilnya. Error jika `n2 = 0`.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            n1: 20,
            n2: 4,
          },
        },
        responseExample: { result: 5 },
        isPremium: false,
        sortOrder: 3,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // 3. OpenWeatherMap API
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'openweather',
    name: 'OpenWeatherMap API',
    shortDescription: 'Data cuaca real-time dan prakiraan untuk seluruh dunia',
    description:
      'OpenWeatherMap API menyediakan data cuaca real-time, prakiraan cuaca (hourly & daily), data historis, serta berbagai kondisi atmosfer untuk lebih dari 200.000 kota di seluruh dunia. Response tersedia dalam berbagai satuan (metric, imperial, standard) dan mendukung banyak bahasa termasuk Bahasa Indonesia.',
    category: 'weather',
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    pricingType: 'FREEMIUM',
    status: 'ACTIVE',
    version: 'v2.5',
    isPublished: true,
    sortOrder: 12,
    plans: [
      {
        name: 'FREE',
        priceCents: 0,
        requestsPerDay: 1000,
        requestsPerMinute: 60,
        features: [
          'Cuaca saat ini',
          '5 hari / 3 jam forecast',
          '1000 request/hari',
          'Semua kota di dunia',
        ],
        sortOrder: 0,
      },
      {
        name: 'PRO',
        priceCents: 39900,
        requestsPerDay: 100000,
        requestsPerMinute: 600,
        features: [
          'Everything in FREE',
          'Hourly forecast 4 hari',
          '30 hari historical data',
          'Air quality index',
          'UV index',
        ],
        sortOrder: 1,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/weather',
        summary: 'Cuaca saat ini berdasarkan nama kota',
        description:
          'Mengembalikan kondisi cuaca terkini untuk sebuah kota. Mendukung parameter `units` (metric/imperial/standard) dan `lang` untuk bahasa response.',
        requestExample: {
          query: {
            q: 'Jakarta',
            appid: '<YOUR_API_KEY>',
            units: 'metric',
            lang: 'id',
          },
        },
        responseExample: {
          coord: { lon: 106.8451, lat: -6.2146 },
          weather: [
            { id: 802, main: 'Clouds', description: 'awan tersebar', icon: '03n' },
          ],
          main: {
            temp: 26.72,
            feels_like: 28.75,
            temp_min: 26.61,
            temp_max: 26.72,
            pressure: 1012,
            humidity: 75,
          },
          visibility: 10000,
          wind: { speed: 0.45, deg: 151 },
          clouds: { all: 49 },
          name: 'Jakarta',
          cod: 200,
        },
        isPremium: false,
        sortOrder: 0,
      },
      {
        method: 'GET',
        path: '/weather',
        summary: 'Cuaca saat ini berdasarkan koordinat',
        description:
          'Mengembalikan kondisi cuaca terkini berdasarkan latitude dan longitude.',
        requestExample: {
          query: {
            lat: -6.2146,
            lon: 106.8451,
            appid: '<YOUR_API_KEY>',
            units: 'metric',
          },
        },
        responseExample: {
          name: 'Jakarta',
          main: { temp: 26.72, humidity: 75 },
          weather: [{ description: 'awan tersebar' }],
          cod: 200,
        },
        isPremium: false,
        sortOrder: 1,
      },
      {
        method: 'GET',
        path: '/forecast',
        summary: 'Prakiraan cuaca 5 hari (setiap 3 jam)',
        description:
          'Mengembalikan prakiraan cuaca untuk 5 hari ke depan dengan interval 3 jam. Data mencakup suhu, kelembaban, angin, dan kondisi langit.',
        requestExample: {
          query: {
            q: 'Jakarta',
            appid: '<YOUR_API_KEY>',
            units: 'metric',
            lang: 'id',
          },
        },
        responseExample: {
          list: [
            {
              dt: 1785172800,
              main: { temp: 27.1, humidity: 72 },
              weather: [{ description: 'hujan ringan' }],
              dt_txt: '2025-07-27 18:00:00',
            },
          ],
          city: { name: 'Jakarta', country: 'ID' },
        },
        isPremium: false,
        sortOrder: 2,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // 4. Abstract Exchange Rates API
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'exchange-rates',
    name: 'Exchange Rates API',
    shortDescription: 'Kurs tukar mata uang real-time dari 80+ valuta',
    description:
      'Abstract Exchange Rates API menyediakan nilai tukar mata uang secara real-time untuk lebih dari 80 valuta. Mendukung konversi antar mata uang, riwayat kurs historis, dan berbagai pasangan mata uang termasuk IDR. Data diperbarui setiap 60 menit dari sumber finansial terpercaya.',
    category: 'finance',
    baseUrl: 'https://exchange-rates.abstractapi.com/v1',
    pricingType: 'FREEMIUM',
    status: 'ACTIVE',
    version: 'v1',
    isPublished: true,
    sortOrder: 13,
    plans: [
      {
        name: 'FREE',
        priceCents: 0,
        requestsPerDay: 1000,
        requestsPerMinute: 1,
        features: [
          'Live exchange rates',
          '80+ mata uang',
          '1 request/menit',
          'Update setiap 60 menit',
        ],
        sortOrder: 0,
      },
      {
        name: 'PRO',
        priceCents: 19900,
        requestsPerDay: 50000,
        requestsPerMinute: 60,
        features: [
          'Everything in FREE',
          'Currency conversion',
          'Historical rates',
          '60 request/menit',
          'Update real-time',
        ],
        sortOrder: 1,
      },
      {
        name: 'ENTERPRISE',
        priceCents: 99900,
        requestsPerDay: null,
        requestsPerMinute: 300,
        features: [
          'Everything in PRO',
          'Unlimited requests',
          'Webhook support',
          'Dedicated SLA',
        ],
        sortOrder: 2,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/live',
        summary: 'Kurs tukar live (base → satu atau semua target)',
        description:
          'Mengambil nilai tukar terkini dari mata uang `base` ke satu atau lebih mata uang `target`. Jika `target` dikosongkan, mengembalikan semua valuta yang tersedia.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            base: 'USD',
            target: 'IDR',
          },
        },
        responseExample: {
          base: 'USD',
          last_updated: 1785071700,
          exchange_rates: {
            IDR: 18052.647291,
          },
        },
        isPremium: false,
        sortOrder: 0,
      },
      {
        method: 'GET',
        path: '/convert',
        summary: 'Konversi nilai antar dua mata uang',
        description:
          'Mengkonversi sejumlah uang dari mata uang sumber ke mata uang tujuan menggunakan kurs live.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            base: 'USD',
            target: 'IDR',
            base_amount: 100,
          },
        },
        responseExample: {
          base: 'USD',
          target: 'IDR',
          base_amount: 100,
          converted_amount: 1805264.73,
          exchange_rate: 18052.647291,
          last_updated: 1785071700,
        },
        isPremium: true,
        sortOrder: 1,
      },
      {
        method: 'GET',
        path: '/historical',
        summary: 'Kurs tukar pada tanggal tertentu',
        description:
          'Mengambil nilai tukar historis untuk tanggal tertentu. Parameter `date` dalam format `YYYY-MM-DD`.',
        requestExample: {
          query: {
            api_key: '<YOUR_API_KEY>',
            base: 'USD',
            target: 'IDR',
            date: '2025-01-01',
          },
        },
        responseExample: {
          base: 'USD',
          date: '2025-01-01',
          exchange_rates: {
            IDR: 16200.5,
          },
        },
        isPremium: true,
        sortOrder: 2,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const svc of services) {
      // 1. Upsert service
      const tempId = randomUUID();
      await client.query(
        `INSERT INTO api_services (
            id, slug, name, short_description, description, category,
            base_url, pricing_type, status, version, is_published, sort_order
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (slug) DO UPDATE SET
            name             = EXCLUDED.name,
            short_description = EXCLUDED.short_description,
            description      = EXCLUDED.description,
            base_url         = EXCLUDED.base_url,
            pricing_type     = EXCLUDED.pricing_type,
            status           = EXCLUDED.status,
            is_published     = EXCLUDED.is_published,
            sort_order       = EXCLUDED.sort_order,
            updated_at       = NOW()`,
        [
          tempId,
          svc.slug,
          svc.name,
          svc.shortDescription,
          svc.description,
          svc.category,
          svc.baseUrl,
          svc.pricingType,
          svc.status,
          svc.version,
          svc.isPublished,
          svc.sortOrder,
        ],
      );

      // Fetch actual id (handles upsert case)
      const { rows: [row] } = await client.query<{ id: string }>(
        `SELECT id FROM api_services WHERE slug = $1`,
        [svc.slug],
      );
      const serviceId = row.id;

      // 2. Insert plans (skip if already exists for this service + name)
      for (const plan of svc.plans) {
        await client.query(
          `INSERT INTO api_plans (
              id, service_id, name, price_cents, requests_per_day,
              requests_per_minute, features, is_active, sort_order
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (service_id, name) DO NOTHING`,
          [
            randomUUID(),
            serviceId,
            plan.name,
            plan.priceCents,
            plan.requestsPerDay,
            plan.requestsPerMinute,
            JSON.stringify(plan.features),
            true,
            plan.sortOrder,
          ],
        );
      }

      // 3. Insert endpoints (skip duplicates by service_id + method + path + sort_order)
      for (const ep of svc.endpoints) {
        await client.query(
          `INSERT INTO api_endpoints (
              id, service_id, method, path, summary, description,
              request_example, response_example, is_premium, sort_order
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (service_id, method, path) DO NOTHING`,
          [
            randomUUID(),
            serviceId,
            ep.method,
            ep.path,
            ep.summary,
            ep.description,
            ep.requestExample ? JSON.stringify(ep.requestExample) : null,
            JSON.stringify(ep.responseExample),
            ep.isPremium,
            ep.sortOrder,
          ],
        );
      }

      console.log(`  ✓ ${svc.name} (slug: ${svc.slug})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed berhasil — 4 API ditambahkan ke API Directory');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed gagal:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
