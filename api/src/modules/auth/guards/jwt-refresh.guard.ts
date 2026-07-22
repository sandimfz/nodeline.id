import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RefreshRequest {
  cookies?: Record<string, string | undefined>;
  body?: { refreshToken?: string };
  user?: Record<string, unknown>;
}

/**
 * Extracts the opaque refresh token from the httpOnly cookie (or body
 * `refreshToken` field) and attaches it to `req.user.rawRefreshToken`.
 * The actual token validation, rotation, and reuse detection happen in
 * AuthService.refreshTokens() — called by the controller.
 *
 * Named with the "jwt-refresh" intent from the spec, though refresh tokens
 * here are opaque (sha256-hashed) rather than JWTs, which is a safer design
 * for a DB-backed rotation scheme.
 */
@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RefreshRequest>();
    const cookieName = this.config.get<string>('refreshCookie.name')!;
    const fromCookie = req?.cookies?.[cookieName];
    const fromBody = req?.body?.refreshToken;
    const rawRefreshToken = fromCookie ?? fromBody;

    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }

    req.user = {
      ...(req.user ?? {}),
      rawRefreshToken,
    };
    return true;
  }
}
