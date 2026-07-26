import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { AuthService } from './auth.service.js';

/**
 * OAuth controller for Google and GitHub login.
 *
 * Flow:
 * 1. Client calls GET /auth/oauth/:provider → server sets state cookie & returns { url }
 * 2. User authenticates with provider
 * 3. Provider redirects to client callback URL with code + state
 * 4. Client sends code + state to GET /auth/oauth/:provider/callback
 * 5. Server validates state against cookie (CSRF protection), exchanges code for tokens
 *
 * The `state` parameter prevents CSRF/login-CSRF attacks by ensuring the
 * callback was initiated by the same browser session that started the flow.
 */

/** Cookie name for OAuth state. Short-lived, httpOnly, same-site lax. */
const OAUTH_STATE_COOKIE = 'nl_oauth_state';
/** State validity window in milliseconds (5 minutes). */
const STATE_TTL_MS = 5 * 60 * 1000;

@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── State helpers ─────────────────────────────────────────

  /**
   * Generate a signed, timestamped OAuth state value.
   * Format: `<random_hex>.<timestamp_ms>.<hmac_hex>`
   */
  private generateState(): string {
    const random = randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const payload = `${random}.${timestamp}`;
    const secret = this.config.get<string>('jwt.access.secret')!;
    const hmac = createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}.${hmac}`;
  }

  /**
   * Validate state: check HMAC signature and expiry.
   * Returns true only if state matches cookie AND signature is valid AND not expired.
   */
  private validateState(state: string | undefined, cookieState: string | undefined): boolean {
    if (!state || !cookieState) return false;
    if (state !== cookieState) return false;

    const parts = state.split('.');
    if (parts.length !== 3) return false;

    const [random, timestamp, hmac] = parts;
    const payload = `${random}.${timestamp}`;
    const secret = this.config.get<string>('jwt.access.secret')!;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    // Constant-time compare to prevent timing attacks
    const hmacBuf = Buffer.from(hmac, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (hmacBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(hmacBuf, expectedBuf)) return false;

    // Check expiry
    const ts = Number(timestamp);
    if (Number.isNaN(ts) || Date.now() - ts > STATE_TTL_MS) return false;

    return true;
  }

  /**
   * Set state cookie on the response.
   */
  private setStateCookie(res: Response, state: string): void {
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: this.config.get<boolean>('refreshCookie.secure'),
      sameSite: 'lax', // Must be lax for OAuth redirects to carry the cookie back
      path: '/api/v1/auth/oauth',
      maxAge: STATE_TTL_MS,
    });
  }

  /**
   * Clear state cookie after consumption.
   */
  private clearStateCookie(res: Response): void {
    res.clearCookie(OAUTH_STATE_COOKIE, {
      httpOnly: true,
      secure: this.config.get<boolean>('refreshCookie.secure'),
      sameSite: 'lax',
      path: '/api/v1/auth/oauth',
    });
  }

  // ─── Google ────────────────────────────────────────────────

  @Get('google')
  @HttpCode(HttpStatus.OK)
  getGoogleAuthUrl(@Res({ passthrough: true }) res: Response) {
    const clientId = this.config.get<string>('oauth.google.clientId');
    const redirectBase = this.config.get<string>('oauth.redirectBase');
    const redirectUri = `${redirectBase}/auth/callback/google`;

    if (!clientId) throw new BadRequestException('Google OAuth not configured');

    const state = this.generateState();
    this.setStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) throw new BadRequestException('Missing authorization code');

    // Validate OAuth state to prevent CSRF
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    if (!this.validateState(state, cookieState)) {
      this.clearStateCookie(res);
      throw new BadRequestException('Invalid or expired OAuth state. Please try again.');
    }
    this.clearStateCookie(res);

    const clientId = this.config.get<string>('oauth.google.clientId')!;
    const clientSecret = this.config.get<string>('oauth.google.clientSecret')!;
    const redirectBase = this.config.get<string>('oauth.redirectBase')!;
    const redirectUri = `${redirectBase}/auth/callback/google`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new BadRequestException('Failed to exchange Google authorization code');
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new BadRequestException('Failed to get Google user info');
    }

    const googleUser = (await userInfoRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    // Find or create user, issue tokens
    const result = await this.auth.oauthLogin({
      provider: 'google',
      providerId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture ?? null,
    });

    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  // ─── GitHub ────────────────────────────────────────────────

  @Get('github')
  @HttpCode(HttpStatus.OK)
  getGithubAuthUrl(@Res({ passthrough: true }) res: Response) {
    const clientId = this.config.get<string>('oauth.github.clientId');
    const redirectBase = this.config.get<string>('oauth.redirectBase');
    const redirectUri = `${redirectBase}/auth/callback/github`;

    if (!clientId) throw new BadRequestException('GitHub OAuth not configured');

    const state = this.generateState();
    this.setStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email read:user',
      state,
    });

    return { url: `https://github.com/login/oauth/authorize?${params}` };
  }

  @Get('github/callback')
  @HttpCode(HttpStatus.OK)
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) throw new BadRequestException('Missing authorization code');

    // Validate OAuth state to prevent CSRF
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    if (!this.validateState(state, cookieState)) {
      this.clearStateCookie(res);
      throw new BadRequestException('Invalid or expired OAuth state. Please try again.');
    }
    this.clearStateCookie(res);

    const clientId = this.config.get<string>('oauth.github.clientId')!;
    const clientSecret = this.config.get<string>('oauth.github.clientSecret')!;
    const redirectBase = this.config.get<string>('oauth.redirectBase')!;
    const redirectUri = `${redirectBase}/auth/callback/github`;

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new BadRequestException('Failed to exchange GitHub authorization code');
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    if (!tokenData.access_token) {
      throw new BadRequestException('GitHub did not return access token');
    }

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!userRes.ok) {
      throw new BadRequestException('Failed to get GitHub user info');
    }

    const ghUser = (await userRes.json()) as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string;
    };

    // GitHub email may be private — fetch from /user/emails
    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email ?? emails[0]?.email ?? null;
      }
    }

    if (!email) {
      throw new BadRequestException(
        'GitHub account does not have a verified email',
      );
    }

    const result = await this.auth.oauthLogin({
      provider: 'github',
      providerId: String(ghUser.id),
      email,
      name: ghUser.name ?? ghUser.login,
      avatarUrl: ghUser.avatar_url,
    });

    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private setRefreshCookie(res: Response, rawRefreshToken: string) {
    const cookieName = this.config.get<string>('refreshCookie.name')!;
    res.cookie(cookieName, rawRefreshToken, {
      httpOnly: true,
      secure: this.config.get<boolean>('refreshCookie.secure'),
      sameSite: this.config.get<'strict' | 'lax' | 'none'>(
        'refreshCookie.sameSite',
      ),
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
