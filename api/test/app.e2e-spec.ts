/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-asserted-optional-chain */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module.js';

/**
 * End-to-end auth flow against the real app + Postgres.
 * Relies on .env being present at the repo root (same as `pnpm start`).
 */
describe('Auth flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@nodeline.test`;

  it('registers → me → refresh → logout', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', name: 'E2E' })
      .expect(201);

    expect(reg.body.accessToken).toBeTruthy();
    expect(reg.body.user.email).toBe(email);
    const setCookie = reg.headers['set-cookie'] as unknown as string[];
    expect(setCookie?.some((c) => c.startsWith('nl_refresh='))).toBe(true);
    const refreshToken = /nl_refresh=([^;]+)/.exec(setCookie[0])?.[1]!;
    expect(refreshToken).toMatch(/^nl_rt_/);

    // Protected endpoint with the access token.
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    // Refresh rotates the token (cookie + new accessToken).
    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`nl_refresh=${refreshToken}`])
      .expect(200);
    expect(refresh.body.accessToken).toBeTruthy();
    const rotatedCookie = refresh.headers['set-cookie'] as unknown as string[];
    const rotatedToken = /nl_refresh=([^;]+)/.exec(rotatedCookie[0])?.[1]!;
    expect(rotatedToken).not.toBe(refreshToken);

    // Reusing the OLD refresh token must be rejected (reuse detection).
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`nl_refresh=${refreshToken}`])
      .expect(401);

    // Logout with the rotated token.
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refresh.body.accessToken}`)
      .set('Cookie', [`nl_refresh=${rotatedToken}`])
      .expect(200);

    // After logout, the rotated token is dead too.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`nl_refresh=${rotatedToken}`])
      .expect(401);
  });
});
