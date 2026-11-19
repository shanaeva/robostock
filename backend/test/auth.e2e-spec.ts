import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const REGISTER_INPUT = {
  name: 'Test User',
  email: 'test@example.com',
};
const PASSWORD = 'password123';

describe('Auth API with PostgreSQL', () => {
  let app: INestApplication<Server> | undefined;
  let prisma: PrismaService;
  let server: Server;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication<INestApplication<Server>>({
      logger: false,
    });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.emailCode.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getCsrf(): Promise<{ cookie: string; token: string }> {
    const res = await request(server).get('/auth/csrf');
    const cookie =
      (res.headers['set-cookie'] as string[] | undefined)?.find((c) =>
        c.startsWith('csrf_token='),
      ) ?? '';
    const token = (res.body as { csrfToken?: string }).csrfToken ?? '';

    return { cookie, token };
  }

  async function register(input = REGISTER_INPUT) {
    const { cookie, token } = await getCsrf();

    return request(server)
      .post('/auth/register')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send(input);
  }

  // Verifies email and sets password in one step (as the real flow works).
  async function verifyAndSetPassword(email = REGISTER_INPUT.email) {
    const code = await prisma.emailCode
      .findFirst({ where: { user: { email } } })
      .then(async (record) => {
        if (!record) {
          throw new Error(`No email code found for ${email}`);
        }
        // Decode digest back is not possible — reset with known code instead.
        const { codeDigest } =
          await import('../src/modules/auth/auth.crypto.js');
        const { ConfigService } = await import('@nestjs/config');
        const cfg = app?.get(ConfigService);
        const knownCode = '123456';
        await prisma.emailCode.update({
          where: { id: record.id },
          data: {
            digest: codeDigest(
              cfg?.get('AUTH_CODE_SECRET') as string,
              email,
              'VERIFY_EMAIL',
              knownCode,
            ),
          },
        });

        return knownCode;
      });

    const { cookie, token } = await getCsrf();

    return request(server)
      .post('/auth/verify-email')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email, code, password: PASSWORD });
  }

  async function login(email = REGISTER_INPUT.email, pass = PASSWORD) {
    const { cookie, token } = await getCsrf();

    return request(server)
      .post('/auth/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email, password: pass, rememberMe: false });
  }

  describe('GET /auth/settings', () => {
    it('возвращает emailEnabled', async () => {
      const res = await request(server).get('/auth/settings');
      expect(res.status).toBe(200);
      expect(typeof (res.body as { emailEnabled: unknown }).emailEnabled).toBe(
        'boolean',
      );
    });
  });

  describe('POST /auth/register', () => {
    it('создаёт аккаунт и возвращает 202', async () => {
      const res = await register();
      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('message');
    });

    it('возвращает 202 для существующего email (не раскрывает факт существования)', async () => {
      await register();
      const res = await register();
      expect(res.status).toBe(202);
    });

    it('возвращает 400 при невалидных данных', async () => {
      const { cookie, token } = await getCsrf();
      const res = await request(server)
        .post('/auth/register')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('подтверждает email, устанавливает пароль и возвращает сообщение', async () => {
      await register();
      const res = await verifyAndSetPassword();
      expect(res.status).toBe(200);
      expect((res.body as { message: unknown }).message).toBeTruthy();
      const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
      expect(cookies.some((c) => c.startsWith('access_token='))).toBe(false);
    });

    it('возвращает 400 при неверном коде', async () => {
      await register();
      const { cookie, token } = await getCsrf();
      const res = await request(server)
        .post('/auth/verify-email')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          email: REGISTER_INPUT.email,
          code: '000000',
          password: PASSWORD,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await register();
      await verifyAndSetPassword();
    });

    it('выдаёт 401 при неверном пароле', async () => {
      const res = await login(REGISTER_INPUT.email, 'wrongpassword');
      expect(res.status).toBe(401);
    });

    it('выдаёт 401 для несуществующего email', async () => {
      const res = await login('nobody@example.com');
      expect(res.status).toBe(401);
    });

    it('возвращает данные пользователя при успешном входе', async () => {
      const res = await login();
      expect(res.status).toBe(200);
      expect((res.body as { user: unknown }).user).toMatchObject({
        email: REGISTER_INPUT.email,
        name: REGISTER_INPUT.name,
        emailVerified: true,
      });
      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies?.some((c) => c.startsWith('access_token='))).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('возвращает 401 без токена', async () => {
      const res = await request(server).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('возвращает данные текущего пользователя с валидным токеном', async () => {
      await register();
      await verifyAndSetPassword();
      const loginRes = await login();
      const cookies = (
        loginRes.headers['set-cookie'] as unknown as string[]
      ).join('; ');

      const res = await request(server).get('/auth/me').set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect((res.body as { user: { email: string } }).user.email).toBe(
        REGISTER_INPUT.email,
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('выходит из аккаунта и инвалидирует сессию', async () => {
      await register();
      await verifyAndSetPassword();
      const loginRes = await login();
      const cookies = (
        loginRes.headers['set-cookie'] as unknown as string[]
      ).join('; ');

      const { cookie: csrfCookie, token } = await getCsrf();
      const logoutRes = await request(server)
        .post('/auth/logout')
        .set('Cookie', `${cookies}; ${csrfCookie.split(';')[0] ?? ''}`)
        .set('X-CSRF-Token', token);

      expect(logoutRes.status).toBe(200);

      const meRes = await request(server)
        .get('/auth/me')
        .set('Cookie', cookies);
      expect(meRes.status).toBe(401);
    });
  });
});
