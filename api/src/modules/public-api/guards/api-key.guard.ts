import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service.js';

/**
 * Validates API key from the request.
 * Supports Authorization: Bearer <key> or X-Api-Key header.
 * Uses constant-time comparison to prevent timing attacks.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract API key from header
    const authHeader = request.headers.authorization as string | undefined;
    let apiKey: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7).trim();
    }

    if (!apiKey) {
      apiKey = request.headers['x-api-key'] as string | undefined;
    }

    if (!apiKey) {
      throw new UnauthorizedException('API key dibutuhkan');
    }

    // Validate via service (constant-time compare)
    const keyRecord = await this.apiKeys.validateKey(apiKey);

    if (!keyRecord) {
      throw new UnauthorizedException('API key tidak valid');
    }

    // Check if key has expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new ForbiddenException('API key sudah kedaluwarsa');
    }

    // Check allowed symbols constraint (applied later in controller)
    const allowedSymbols = keyRecord.allowedSymbols
      ? keyRecord.allowedSymbols.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    // Attach to request for downstream use
    request.apiKey = {
      id: keyRecord.id,
      userId: keyRecord.userId,
      plan: keyRecord.plan,
      rateLimitPerMin: keyRecord.rateLimitPerMin,
      allowedSymbols,
    };

    return true;
  }
}
