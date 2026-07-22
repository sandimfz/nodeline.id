/**
 * Promote a registered user to the 'god' role by email.
 *
 * Usage:
 *   node --import tsx --env-file=.env scripts/seed-god.ts you@example.com
 *
 * Or run via the npm script:
 *   pnpm seed:god you@example.com
 *
 * Manual SQL alternative (no script needed):
 *   UPDATE users SET role = 'god' WHERE email = 'you@example.com';
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../src/database/drizzle/schema/index.js';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: pnpm seed:god <email>');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set (load it via --env-file=.env)');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    const [user] = await db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      console.error(`User dengan email "${email}" tidak ditemukan.`);
      process.exit(1);
    }

    if (user.role === 'god') {
      console.log(`User "${email}" sudah berstatus 'god'.`);
    } else {
      await db
        .update(schema.users)
        .set({ role: 'god' })
        .where(eq(schema.users.email, email));
      console.log(`User "${email}" (${user.id}) dipromosikan ke 'god'.`);
    }
  } catch (err) {
    console.error('Gagal promote user:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
