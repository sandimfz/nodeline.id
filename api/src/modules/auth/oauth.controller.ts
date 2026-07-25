import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';

/**
 * OAuth controller for Google and GitHub login.
 *
 * Flow:
 * 1. Client redirects to GET /auth/oauth/:provider (returns redirect URL)
 * 2. User authenticates with provider
 * 3. Provider redirects to client callback URL with code
 * 4. Client sends code to GET /auth/oauth/:provider/callback
 * 5. Server exchanges code for tokens, find-or-create user, issue JWT
 */
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Google ────────────────────────────────────────────────

  @Get('google')
  @HttpCode(HttpStatus.OK)
  getGoogleAuthUrl() {
    const clientId = this.config.get<string>('oauth.google.clientId');
    const redirectBase = this.config.get<string>('oauth.redirectBase');
    const redirectUri = `${redirectBase}/auth/callback/google`;

    if (!clientId) throw new BadRequestException('Google OAuth not configured');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Query('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) throw new BadRequestException('Missing authorization code');

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
  getGithubAuthUrl() {
    const clientId = this.config.get<string>('oauth.github.clientId');
    const redirectBase = this.config.get<string>('oauth.redirectBase');
    const redirectUri = `${redirectBase}/auth/callback/github`;

    if (!clientId) throw new BadRequestException('GitHub OAuth not configured');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email read:user',
    });

    return { url: `https://github.com/login/oauth/authorize?${params}` };
  }

  @Get('github/callback')
  @HttpCode(HttpStatus.OK)
  async githubCallback(
    @Query('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) throw new BadRequestException('Missing authorization code');

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
