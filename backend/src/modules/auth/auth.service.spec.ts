import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailService } from '../mail/mail.service.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

vi.mock('./auth.crypto.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth.crypto.js')>();

  return {
    ...actual,
    hashPassword: vi.fn().mockResolvedValue('hashed$mock'),
    verifyPassword: vi.fn().mockResolvedValue(true),
  };
});

const JWT_KEY = 'test-jwt-key-must-be-at-least-32chars!!-x';
const CODE_KEY = 'test-code-key-must-be-at-least-32chars!!';

const USER = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  name: 'Test User',
  email: 'user@example.com',
  passwordHash: 'hashed$mock',
  verifiedAt: new Date('2026-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const SESSION = { id: 'sess-0000-0000-0000-000000000001' };

function makeRepo() {
  return {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    upsertEmailCode: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(SESSION),
    findRefreshToken: vi.fn(),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
    rotateRefreshToken: vi.fn().mockResolvedValue(undefined),
    findSessionWithUser: vi.fn(),
    findActiveEmailCode: vi.fn(),
    incrementCodeAttempts: vi.fn().mockResolvedValue(undefined),
    $transaction: vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          emailCode: { update: vi.fn().mockResolvedValue({}) },
          user: { update: vi.fn().mockResolvedValue({}) },
          session: { updateMany: vi.fn().mockResolvedValue({}) },
        }),
      ),
  };
}

function makeConfig() {
  return {
    getOrThrow: vi.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_SECRET: JWT_KEY,
        AUTH_CODE_SECRET: CODE_KEY,
        AUTH_EMAIL_ENABLED: 'true',
        CSRF_SECRET: 'test csrf key must be at least 32 chars',
        FRONTEND_ORIGIN: 'http://localhost:3000',
      };

      if (!(key in map)) {
        throw new Error(`Missing env: ${key}`);
      }

      return map[key];
    }),
  };
}

function makeMail() {
  return { sendCodeFireAndForget: vi.fn() };
}

describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let repo: ReturnType<typeof makeRepo>;
  let mail: ReturnType<typeof makeMail>;

  beforeEach(async () => {
    repo = makeRepo();
    mail = makeMail();
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repo },
        { provide: ConfigService, useValue: makeConfig() },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('register', () => {
    it('создаёт пользователя и отправляет код для нового email', async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue({ id: USER.id, email: USER.email });

      const result = await service.register({
        name: USER.name,
        email: USER.email,
      });

      expect(repo.createUser).toHaveBeenCalledOnce();
      expect(repo.upsertEmailCode).toHaveBeenCalledOnce();
      expect(mail.sendCodeFireAndForget).toHaveBeenCalledOnce();
      expect(result.message).toContain('Проверьте почту');
    });

    it('возвращает generic-ответ для существующего email без создания записи', async () => {
      repo.findUserByEmail.mockResolvedValue(USER);

      await service.register({ name: USER.name, email: USER.email });

      expect(repo.createUser).not.toHaveBeenCalled();
      expect(mail.sendCodeFireAndForget).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('выбрасывает 401 для несуществующего email', async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'no@example.com',
          password: 'x',
          rememberMe: false,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('выбрасывает 401 при неверном пароле', async () => {
      const { verifyPassword } = await import('./auth.crypto.js');
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);
      repo.findUserByEmail.mockResolvedValue(USER);

      await expect(
        service.login({
          email: USER.email,
          password: 'wrong',
          rememberMe: false,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('выбрасывает 401 для неверифицированного email', async () => {
      repo.findUserByEmail.mockResolvedValue({ ...USER, verifiedAt: null });

      await expect(
        service.login({
          email: USER.email,
          password: 'password123',
          rememberMe: false,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('возвращает токены при успешном входе', async () => {
      repo.findUserByEmail.mockResolvedValue(USER);

      const result = await service.login({
        email: USER.email,
        password: 'password123',
        rememberMe: false,
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe(USER.email);
      expect(repo.createSession).toHaveBeenCalledOnce();
    });
  });

  describe('verifyEmail', () => {
    it('выбрасывает 400 для несуществующего email', async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.verifyEmail('no@example.com', '123456', 'password123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('выбрасывает 400 при неверном коде', async () => {
      repo.findUserByEmail.mockResolvedValue(USER);
      repo.findActiveEmailCode.mockResolvedValue({
        id: 'code-id',
        digest: 'wrong-digest',
        attempts: 0,
      });

      await expect(
        service.verifyEmail(USER.email, '000000', 'password123'),
      ).rejects.toThrow(BadRequestException);

      expect(repo.incrementCodeAttempts).toHaveBeenCalledWith('code-id');
    });

    it('устанавливает пароль и возвращает сообщение при верном коде', async () => {
      const { codeDigest } = await import('./auth.crypto.js');
      const code = '123456';
      const digest = codeDigest(CODE_KEY, USER.email, 'VERIFY_EMAIL', code);

      repo.findUserByEmail.mockResolvedValue(USER);
      repo.findActiveEmailCode.mockResolvedValue({
        id: 'code-id',
        digest,
        attempts: 0,
      });

      const result = await service.verifyEmail(USER.email, code, 'password123');

      expect(repo.$transaction).toHaveBeenCalledOnce();
      expect(repo.createSession).not.toHaveBeenCalled();
      expect(result.message).toBeTruthy();
    });
  });

  describe('forgotPassword', () => {
    it('отправляет код для подтверждённого email', async () => {
      repo.findUserByEmail.mockResolvedValue(USER);

      const result = await service.forgotPassword(USER.email);

      expect(repo.upsertEmailCode).toHaveBeenCalledOnce();
      expect(mail.sendCodeFireAndForget).toHaveBeenCalledOnce();
      expect(result.message).toBeTruthy();
    });

    it('возвращает generic-ответ для несуществующего email', async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('no@example.com');

      expect(repo.upsertEmailCode).not.toHaveBeenCalled();
      expect(result.message).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('отзывает сессию по refresh-токену', async () => {
      const rt = 'some-refresh-rt';
      repo.findRefreshToken.mockResolvedValue({
        sessionId: SESSION.id,
        session: { id: SESSION.id },
      });

      await service.logout(undefined, rt);

      expect(repo.revokeSession).toHaveBeenCalledWith(SESSION.id);
    });

    it('возвращает успех даже без токенов', async () => {
      const result = await service.logout(undefined, undefined);
      expect(result.message).toBeTruthy();
    });
  });
});
