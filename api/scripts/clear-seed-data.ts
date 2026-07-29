/**
 * Clear all seed data from API Directory tables.
 * Run: node --import tsx --env-file=.env scripts/clear-seed-data.ts
 */
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    'postgres://avnadmin:AVNS_5x4mzJxNlYr1oXWdnPs@nodeline-sndimfz-64df.h.aivencloud.com:10510/defaultdb?sslmode=no-verify',
});

async function clear() {
  const client = await pool.connect();

  try {
    // Disable triggers temporarily to handle FK constraints gracefully
    await client.query('SET session_replication_role = replica');

    console.log('🧹 Clearing api_endpoints...');
    await client.query('DELETE FROM api_endpoints');

    console.log('🧹 Clearing api_plans...');
    await client.query('DELETE FROM api_plans');

    console.log('🧹 Clearing api_subscriptions...');
    await client.query('DELETE FROM api_subscriptions');

    console.log('🧹 Clearing subscription_orders...');
    await client.query('DELETE FROM subscription_orders');

    console.log('🧹 Clearing api_services...');
    await client.query('DELETE FROM api_services');

    // Re-enable triggers
    await client.query('SET session_replication_role = origin');

    console.log('\n✅ Semua data seed berhasil dihapus!');
  } catch (err) {
    console.error('❌ Gagal:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

clear();
