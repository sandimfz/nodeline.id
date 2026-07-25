import { Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle/drizzle.service.js';
import { auditLogs } from '../../../database/drizzle/schema/audit-logs.schema.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../database/drizzle/schema/index.js';

// Either the shared db or an active transaction handle works for insertion.
type DbOrTx = NodePgDatabase<typeof schema>;

export interface AuditLogInput {
  actorId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Lightweight audit trail for sensitive marketplace actions (restock, manual
 * assign, payment confirm). `record` accepts an optional transaction so the
 * log entry is written atomically alongside the business change.
 *
 * `notify` is a stub (console.log) standing in for a real buyer notification
 * channel (email/push) — same approach as the Auth module's email stub.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLogService');

  constructor(private readonly drizzle: DrizzleService) {}

  async record(tx: DbOrTx | null, input: AuditLogInput): Promise<void> {
    const db: DbOrTx = tx ?? this.drizzle.db;
    await db.insert(auditLogs).values({
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: input.meta ?? null,
    });
  }

  // Notification stub — mirrors the Auth module's console.log email stub.
  notify(message: string): void {
    this.logger.log(`[NOTIFY] ${message}`);
  }

  /** Read-side helper used by ops/admins if needed later. */
  async findByEntity(entity: string, entityId: string) {
    return this.drizzle.db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.entity, entity), eq(auditLogs.entityId, entityId)),
      );
  }
}
