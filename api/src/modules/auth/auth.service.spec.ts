import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DrizzleService } from '../../database/drizzle/drizzle.service.js';
import { AuthService } from './auth.service.js';
import configuration from '../../config/configuration.js';
import { envValidationSchema } from '../../config/validation.schema.js';

/**
 * Hits the real database (nodeline_api) via DrizzleService. The auth flow
 * depends on PG (argon2 is fine to unit-test, but rotation/reuse detection
 * is a multi-statement DB dance that's meaningless against a mock).
 */
describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let db: DrizzleService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: (raw) => {
            const result = envValidationSchema.safeParse(raw);
            if (!result.success) {
              throw new Error(
                'Invalid env for tests: ' +
                  result.error.issues.map((i) => i.message).join('; '),
              );
            }
            return result.data;
          },
        }),
        JwtModule.register({}),
      ],
      providers: [AuthService, DrizzleService],
    }).compile();

    service = module.get(AuthService);
    db = module.get(DrizzleService);
    db.onModuleInit();
  });

  afterAll(async () => {
    await db.onModuleDestroy();
    await module.close();
  });

  describe('password hashing & verification', () => {
    it('hashes a password and verifies it against the original', async () => {
      const hash = await service.hashPassword('Password123');
      expect(hash).not.toBe('Password123');
      expect(await service.verifyPassword(hash, 'Password123')).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hash = await service.hashPassword('Password123');
      expect(await service.verifyPassword(hash, 'wrong')).toBe(false);
    });

    it('returns false (not throw) for a malformed hash', async () => {
      expect(await service.verifyPassword('not-a-real-hash', 'x')).toBe(false);
    });
  });

  describe('register + login + me', () => {
    const email = `spec_${Math.floor(Math.random() * 1e9)}@nodeline.test`;
    it('registers a new user and issues tokens', async () => {
      const result = await service.register({
        email,
        password: 'Password123',
        name: 'Spec User',
      });
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toMatch(/^nl_rt_/);
      expect(result.user.email).toBe(email);
      expect(result.user.role).toBe('user');
    });

    it('rejects duplicate registration', async () => {
      await expect(
        service.register({ email, password: 'Password123', name: 'Dup' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('logs in with the registered credentials', async () => {
      const result = await service.login({ email, password: 'Password123' });
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toMatch(/^nl_rt_/);
    });

    it('rejects login with wrong password (generic)', async () => {
      await expect(
        service.login({ email, password: 'Nope1234' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('fetches the user by id', async () => {
      const login = await service.login({
        email,
        password: 'Password123',
      });
      const profile = await service.getUserById(login.user.id);
      expect(profile?.email).toBe(email);
    });
  });

  describe('refresh token rotation & reuse detection', () => {
    // Each it() needs a unique user; otherwise a second register() collides.
    let counter = 0;
    const uniqueEmail = () =>
      `spec_refresh_${Date.now()}_${counter++}@nodeline.test`;

    it('rotates the refresh token on each use', async () => {
      const email = uniqueEmail();
      const reg = await service.register({
        email,
        password: 'Password123',
        name: 'Rot',
      });
      const first = await service.refreshTokens(reg.refreshToken);
      const second = await service.refreshTokens(first.refreshToken);

      expect(first.accessToken).toBeTruthy();
      expect(second.accessToken).toBeTruthy();
      // Each rotation must yield a brand-new refresh token.
      expect(first.refreshToken).not.toBe(reg.refreshToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
    });

    it('detects reuse of a rotated token and revokes ALL sessions', async () => {
      const email = uniqueEmail();
      const reg = await service.register({
        email,
        password: 'Password123',
        name: 'Reuse',
      });
      const rotated = await service.refreshTokens(reg.refreshToken);

      // Reusing the original (now-revoked) token must throw.
      await expect(
        service.refreshTokens(reg.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // And the freshly-rotated token must now be dead too — all sessions killed.
      await expect(
        service.refreshTokens(rotated.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown refresh token', async () => {
      await expect(
        service.refreshTokens('nl_rt_totally_unknown'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('logout revokes the given refresh token', async () => {
      const email = uniqueEmail();
      const reg = await service.register({
        email,
        password: 'Password123',
        name: 'Logout',
      });
      await service.logout(reg.refreshToken);
      await expect(
        service.refreshTokens(reg.refreshToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
