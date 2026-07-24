import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Log an API request to the usage logs.
   * Fire-and-forget: failures are logged but not thrown.
   */
  async logRequest(data: {
    apiKeyId: string;
    endpoint: string;
    statusCode: number;
    ipAddress: string;
  }): Promise<void> {
    try {
      await this.drizzle.db.execute(
        sql`
          INSERT INTO api_usage_logs (api_key_id, endpoint, status_code, ip_address)
          VALUES (${data.apiKeyId}, ${data.endpoint}, ${data.statusCode}, ${data.ipAddress})
        `,
      );
    } catch (err) {
      this.logger.error('Failed to log API usage:', err);
    }
  }
}
