import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import { users, refreshTokens } from '../../database/drizzle/schema/index.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import type { RegisterDto, UpdateProfileDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly drizzle: DrizzleService,
  ) {}

  // ---- password hashing (argon2id) ----

  async hashPassword(plain: string): Promise<string> {
    // argon2.hash is typed `Promise<any>` upstream; cast to its real string shape.
    return (await argon2.hash(plain, {
      type: argon2.argon2id, // OWASP-recommended hybrid
      memoryCost: 19456, // ~19 MB
      timeCost: 2,
      parallelism: 1,
    })) as string;
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false; // malformed/unsupported hash → treat as no-match
    }
  }

  // ---- token hashing (sha256 — deterministic, fast; NOT for passwords) ----

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private generateRefreshTokenRaw(): string {
    // Opaque random token (NOT a JWT). Only its sha256 hash is ever stored;
    // the raw value is handed to the client via httpOnly cookie. A DB leak
    // therefore cannot yield a usable refresh token.
    return `nl_rt_${randomBytes(48).toString('base64url')}`;
  }

  private refreshExpiryDate(): Date {
    const ms = this.msFromExpiry(
      this.config.get<string>('jwt.refresh.expiresIn') ?? '30d',
    );
    return new Date(Date.now() + ms);
  }

  private msFromExpiry(expiresIn: string): number {
    const match = /^(\d+)\s*([smhd])$/.exec(expiresIn.trim());
    if (!match) return 15 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }

  // ---- access token ----

  private signAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomBytes(12).toString('hex'),
    };
    const accessOpts: JwtSignOptions = {
      secret: this.config.get<string>('jwt.access.secret')!,
      expiresIn: (this.config.get<string>('jwt.access.expiresIn') ??
        '15m') as JwtSignOptions['expiresIn'],
    };
    return this.jwt.sign(payload, accessOpts);
  }

  // ---- public auth flow ----

  async register(dto: RegisterDto) {
    const existing = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const [created] = await this.drizzle.db
      .insert(users)
      .values({
        email: dto.email,
        passwordHash,
        name: dto.name,
      })
      .returning();

    return this.issueTokens({
      id: created.id,
      email: created.email,
      role: created.role,
      name: created.name,
    });
  }

  async login(dto: LoginDto, requiredRole?: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    // Generic error — never reveal whether the email exists.
    if (
      !user ||
      !user.passwordHash ||
      !(await this.verifyPassword(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Role gate — for admin login endpoint
    if (requiredRole && user.role !== requiredRole) {
      throw new UnauthorizedException('Akses ditolak');
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  }

  async refreshTokens(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const [stored] = await this.drizzle.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) {
      throw new UnauthorizedException();
    }

    if (stored.isRevoked) {
      // REUSE DETECTED: a rotated-away token was presented again — treat as
      // theft and revoke every session for this user.
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException(
        'Token reuse detected, semua sesi di-logout',
      );
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token kedaluwarsa');
    }

    // Rotate: revoke old, issue + store new.
    const newRawToken = this.generateRefreshTokenRaw();
    const newTokenHash = this.hashToken(newRawToken);
    await this.drizzle.db
      .update(refreshTokens)
      .set({ isRevoked: true, replacedByTokenHash: newTokenHash })
      .where(eq(refreshTokens.id, stored.id));

    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);
    if (!user) {
      // User vanished between token issue and refresh — nuke sessions.
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException();
    }

    await this.drizzle.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: this.refreshExpiryDate(),
    });

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshToken: newRawToken };
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return { message: 'Logged out' };
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.drizzle.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return { message: 'Logged out' };
  }

  async updateUser(id: string, dto: UpdateProfileDto) {
    const [updated] = await this.drizzle.db
      .update(users)
      .set({ name: dto.name, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isEmailVerified: users.isEmailVerified,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    return updated;
  }

  /** Update user avatar URL (set to null to remove). */
  async updateAvatar(userId: string, avatarUrl: string | null) {
    const [updated] = await this.drizzle.db
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isEmailVerified: users.isEmailVerified,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    return updated;
  }

  /** List all users (admin only — excludes passwordHash for security). */
  async findAllUsers() {
    return this.drizzle.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isEmailVerified: users.isEmailVerified,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(users.createdAt);
  }

  async getUserById(id: string) {
    const [user] = await this.drizzle.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isEmailVerified: users.isEmailVerified,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  // ---- helpers ----

  private async revokeAllForUser(userId: string) {
    await this.drizzle.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
        ),
      );
    // Opportunistic cleanup of expired rows for this user.
    await this.drizzle.db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          lt(refreshTokens.expiresAt, new Date()),
        ),
      );
  }

  // ─── OAuth login (find or create user) ─────────────────────

  async oauthLogin(input: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }) {
    // 1. Try find by oauthProvider + oauthId
    let [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.oauthProvider, input.provider),
          eq(users.oauthId, input.providerId),
        ),
      )
      .limit(1);

    if (!user) {
      // 2. Try find by email (link existing account)
      [user] = await this.drizzle.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (user) {
        // Link OAuth to existing account
        await this.drizzle.db
          .update(users)
          .set({
            oauthProvider: input.provider,
            oauthId: input.providerId,
            avatarUrl: user.avatarUrl ?? input.avatarUrl,
            isEmailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      } else {
        // 3. Create new user
        [user] = await this.drizzle.db
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            passwordHash: null,
            oauthProvider: input.provider,
            oauthId: input.providerId,
            avatarUrl: input.avatarUrl,
            isEmailVerified: true,
          })
          .returning();
      }
    } else {
      // Update avatar if changed
      if (input.avatarUrl && input.avatarUrl !== user.avatarUrl) {
        await this.drizzle.db
          .update(users)
          .set({ avatarUrl: input.avatarUrl, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
    name?: string;
    avatarUrl?: string | null;
  }) {
    const accessToken = this.signAccessToken(user);
    const rawRefreshToken = this.generateRefreshTokenRaw();
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.drizzle.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: this.refreshExpiryDate(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
}
