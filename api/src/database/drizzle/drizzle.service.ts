import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import * as schema from './schema/index.js';

/**
 * Owns the pg connection Pool and the Drizzle instance built from it.
 * Exposes `db` for queries and `transaction()` so callers can run multiple
 * statements atomically — the wallet ledger later will depend on this.
 */
@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  public db!: NodePgDatabase<typeof schema>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.pool = new Pool({
      connectionString: this.config.get<string>('database.url'),
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    // Idempotent: TestingModule.close() may trigger this hook again after
    // an explicit end() in a test's afterAll.
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined as unknown as Pool;
    }
  }

  /**
   * Run `fn` inside a DB transaction. Drizzle forwards the same client/tx
   * handle, so callers use it instead of the shared `db`.
   */
  async transaction<T>(
    fn: (
      tx: Parameters<
        Parameters<NodePgDatabase<typeof schema>['transaction']>[0]
      >[0],
    ) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(fn);
  }
}
