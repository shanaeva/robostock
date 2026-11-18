import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import type { Environment } from '../../config/environment.js';
import type { User } from '../../generated/prisma/client.js';
import {
  codeDigest,
  generateCode,
  hashPassword,
  randomToken,
  tokenDigest,
  verifyPassword,
} from './auth.crypto.js';
import { MailService } from '../mail/mail.service.js';
import { AuthRepository } from './auth.repository.js';
import {
  ACCESS_TTL_SECONDS,
  CODE_TTL_MS,
  JWT_MAX_LENGTH,
  REFRESH_TOKEN_MAX_LENGTH,
  SESSION_TTL_MS,
} from './auth.constants.js';

export { ACCESS_TTL_SECONDS };

const INVALID_CODE =
  'Код неверен, истёк или уже использован. Запросите новый код.';

export function publicUser(
  user: Pick<User, 'id' | 'name' | 'email' | 'verifiedAt'>,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.verifiedAt !== null,
  };
}

@Injectable()
export class AuthService {
  private readonly jwtKey: Uint8Array;
  private readonly jwtSecret: string;
  private readonly codeSecret: string;
  private readonly emailEnabled: boolean;
  private readonly dummyHash: Promise<string>;

  constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(ConfigService) config: ConfigService<Environment>,
    @Inject(MailService) private readonly mail: MailService,
  ) {
    this.jwtSecret = config.getOrThrow('JWT_SECRET');
    this.codeSecret = config.getOrThrow('AUTH_CODE_SECRET');
    this.emailEnabled = config.getOrThrow('AUTH_EMAIL_ENABLED') === 'true';
    this.jwtKey = new TextEncoder().encode(this.jwtSecret);
    this.dummyHash = hashPassword(randomToken());
  }

  getSettings() {
    return { emailEnabled: this.emailEnabled };
  }

  async register(input: { name: string; email: string }) {
    const user = await this.repository.findUserByEmail(input.email);
    if (user) {
      return {
        message: 'Если регистрация доступна для этой почты, аккаунт создан.',
      };
    }

    // Store an unknown random hash — the real password is set at verify-email.
    const { id } = await this.repository.createUser({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(randomToken()),
    });

    const code = generateCode();
    const digest = codeDigest(
      this.codeSecret,
      input.email,
      'VERIFY_EMAIL',
      code,
    );
    await this.repository.upsertEmailCode({
      userId: id,
      purpose: 'VERIFY_EMAIL',
      digest,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    this.mail.sendCodeFireAndForget(input.email, code, 'VERIFY_EMAIL');

    return { message: 'Аккаунт создан. Проверьте почту для подтверждения.' };
  }

  async resendVerification(email: string) {
    const user = await this.repository.findUserByEmail(email);
    const ok = {
      message: 'Если аккаунт существует и не подтверждён, письмо отправлено.',
    };
    if (!user || user.verifiedAt) return ok;
    const code = generateCode();
    const digest = codeDigest(this.codeSecret, email, 'VERIFY_EMAIL', code);
    await this.repository.upsertEmailCode({
      userId: user.id,
      purpose: 'VERIFY_EMAIL',
      digest,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    this.mail.sendCodeFireAndForget(email, code, 'VERIFY_EMAIL');
    return ok;
  }

  async verifyEmail(email: string, code: string, password: string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException({
        message: INVALID_CODE,
        code: 'INVALID_CODE',
      });
    }
    const digest = codeDigest(this.codeSecret, email, 'VERIFY_EMAIL', code);
    const record = await this.repository.findActiveEmailCode(
      user.id,
      'VERIFY_EMAIL',
    );
    if (!record || record.digest !== digest) {
      if (record) await this.repository.incrementCodeAttempts(record.id);
      throw new BadRequestException({
        message: INVALID_CODE,
        code: 'INVALID_CODE',
      });
    }

    const passwordHash = await hashPassword(password);

    // Atomically: consume code + set password + mark verified + revoke old sessions.
    await this.repository.$transaction(async (tx) => {
      await tx.emailCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, verifiedAt: new Date() },
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Почта подтверждена. Теперь можно войти.' };
  }

  async login(input: { email: string; password: string; rememberMe: boolean }) {
    const user = await this.repository.findUserByEmail(input.email);

    const hash = user?.passwordHash ?? (await this.dummyHash);
    const matches = await verifyPassword(input.password, hash);

    // Treat unverified email same as wrong credentials to prevent user enumeration.
    if (!user || !matches || (this.emailEnabled && !user.verifiedAt)) {
      throw new UnauthorizedException({
        message: 'Неверная почта или пароль.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const refreshToken = randomToken();
    const ttl = input.rememberMe ? SESSION_TTL_MS.long : SESSION_TTL_MS.short;
    const session = await this.repository.createSession({
      userId: user.id,
      rememberMe: input.rememberMe,
      expiresAt: new Date(Date.now() + ttl),
      tokenDigest: tokenDigest(refreshToken),
    });

    return this.credentials(user, session.id, refreshToken);
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken || rawToken.length > REFRESH_TOKEN_MAX_LENGTH) {
      throw new UnauthorizedException('Сессия истекла. Войдите заново.');
    }

    const found = await this.repository.findRefreshToken(tokenDigest(rawToken));

    if (!found || found.usedAt || found.session.revokedAt) {
      if (found?.usedAt) {
        await this.repository.revokeSession(found.session.id);
      }
      throw new UnauthorizedException('Сессия истекла. Войдите заново.');
    }

    if (found.session.expiresAt < new Date()) {
      throw new UnauthorizedException('Сессия истекла. Войдите заново.');
    }

    const newToken = randomToken();
    await this.repository.$transaction((tx) =>
      this.repository.rotateRefreshToken(
        tx,
        found.id,
        found.sessionId,
        tokenDigest(newToken),
      ),
    );

    return this.credentials(found.session.user, found.sessionId, newToken);
  }

  async logout(
    accessToken: string | undefined,
    refreshToken: string | undefined,
  ) {
    if (refreshToken && refreshToken.length <= REFRESH_TOKEN_MAX_LENGTH) {
      const found = await this.repository.findRefreshToken(
        tokenDigest(refreshToken),
      );
      if (found) await this.repository.revokeSession(found.sessionId);
    }
    if (accessToken && accessToken.length <= JWT_MAX_LENGTH) {
      try {
        const { sessionId } = await this.parseClaims(accessToken);
        await this.repository.revokeSession(sessionId);
      } catch {
        // Invalid token is fine — cookies are cleared anyway.
      }
    }
    return { message: 'Вы вышли из аккаунта.' };
  }

  async logoutAll(userId: string) {
    await this.repository.revokeAllUserSessions(userId);
    return { message: 'Все сессии завершены.' };
  }

  async forgotPassword(email: string) {
    const ok = { message: 'Если аккаунт существует, письмо отправлено.' };
    const user = await this.repository.findUserByEmail(email);
    if (!user || !user.verifiedAt) return ok;
    const code = generateCode();
    const digest = codeDigest(this.codeSecret, email, 'RESET_PASSWORD', code);
    await this.repository.upsertEmailCode({
      userId: user.id,
      purpose: 'RESET_PASSWORD',
      digest,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    this.mail.sendCodeFireAndForget(email, code, 'RESET_PASSWORD');
    return ok;
  }

  async resetPassword(input: {
    email: string;
    code: string;
    newPassword: string;
  }) {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user) {
      throw new BadRequestException({
        message: INVALID_CODE,
        code: 'INVALID_CODE',
      });
    }
    const digest = codeDigest(
      this.codeSecret,
      input.email,
      'RESET_PASSWORD',
      input.code,
    );
    const record = await this.repository.findActiveEmailCode(
      user.id,
      'RESET_PASSWORD',
    );
    if (!record || record.digest !== digest) {
      if (record) await this.repository.incrementCodeAttempts(record.id);
      throw new BadRequestException({
        message: INVALID_CODE,
        code: 'INVALID_CODE',
      });
    }

    const passwordHash = await hashPassword(input.newPassword);

    // Atomically: consume code + update password + revoke all sessions.
    await this.repository.$transaction(async (tx) => {
      await tx.emailCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return {
      message: 'Пароль изменён. Все сессии завершены. Войдите с новым паролем.',
    };
  }

  async authenticate(token: string | undefined) {
    if (!token || token.length > JWT_MAX_LENGTH) {
      throw new UnauthorizedException('Войдите в аккаунт');
    }
    try {
      const { userId, sessionId } = await this.parseClaims(token);
      const session = await this.repository.findSessionWithUser(sessionId);
      if (
        !session ||
        session.userId !== userId ||
        session.revokedAt ||
        session.expiresAt < new Date()
      ) {
        throw new Error('Session invalid');
      }
      return { user: publicUser(session.user), sessionId };
    } catch {
      throw new UnauthorizedException('Сессия истекла. Войдите заново.');
    }
  }

  private async credentials(
    user: User | Pick<User, 'id' | 'name' | 'email' | 'verifiedAt'>,
    sessionId: string,
    refreshToken: string,
  ) {
    const accessToken = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer('robostock')
      .setAudience('robostock-web')
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
      .sign(this.jwtKey);

    return {
      user: publicUser(user as User),
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  private async parseClaims(token: string) {
    const { payload } = await jwtVerify(token, this.jwtKey, {
      algorithms: ['HS256'],
      issuer: 'robostock',
      audience: 'robostock-web',
    });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new Error('Invalid claims');
    }
    return { userId: payload.sub, sessionId: payload.sid as string };
  }
}
