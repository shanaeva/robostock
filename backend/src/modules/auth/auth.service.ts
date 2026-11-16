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

export const ACCESS_TTL_SECONDS = 15 * 60;

// Short-lived sessions expire after 24 hours; remembered sessions after 7 days.
const SESSION_TTL_MS = {
  short: 24 * 60 * 60 * 1000,
  long: 7 * 24 * 60 * 60 * 1000,
};

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
  // Pre-warmed dummy hash prevents user-enumeration via timing on login.
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

  async register(input: { name: string; email: string; password: string }) {
    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.findUserByEmail(input.email);
    if (user) {
      // Don't reveal whether the email exists.
      return {
        message: 'Если регистрация доступна для этой почты, аккаунт создан.',
      };
    }

    const { id } = await this.repository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    if (this.emailEnabled) {
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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      this.mail.sendCodeFireAndForget(input.email, code, 'VERIFY_EMAIL');
    }

    return {
      message: this.emailEnabled
        ? 'Аккаунт создан. Проверьте почту для подтверждения.'
        : 'Аккаунт создан. Теперь можно войти.',
    };
  }

  async resendVerification(email: string) {
    const user = await this.repository.findUserByEmail(email);
    // Always return the same message to prevent user enumeration.
    const ok = {
      message: 'Если аккаунт существует и не подтверждён, письмо отправлено.',
    };
    if (!user || user.verifiedAt || !this.emailEnabled) return ok;
    const code = generateCode();
    const digest = codeDigest(this.codeSecret, email, 'VERIFY_EMAIL', code);
    await this.repository.upsertEmailCode({
      userId: user.id,
      purpose: 'VERIFY_EMAIL',
      digest,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    this.mail.sendCodeFireAndForget(email, code, 'VERIFY_EMAIL');
    return ok;
  }

  async login(input: { email: string; password: string; rememberMe: boolean }) {
    const user = await this.repository.findUserByEmail(input.email);

    // Always run verifyPassword to prevent timing-based user enumeration.
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const matches = await verifyPassword(input.password, hash);

    if (!user || !matches) {
      throw new UnauthorizedException({
        message: 'Неверная почта или пароль.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (this.emailEnabled && !user.verifiedAt) {
      throw new UnauthorizedException({
        message: 'Подтвердите почту перед входом.',
        code: 'EMAIL_NOT_VERIFIED',
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
    if (!rawToken || rawToken.length > 128) {
      throw new UnauthorizedException('Сессия истекла. Войдите заново.');
    }

    const found = await this.repository.findRefreshToken(tokenDigest(rawToken));

    if (!found || found.usedAt || found.session.revokedAt) {
      if (found?.usedAt) {
        // Token reuse detected — revoke the whole session.
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
    if (refreshToken && refreshToken.length <= 128) {
      const found = await this.repository.findRefreshToken(
        tokenDigest(refreshToken),
      );
      if (found) await this.repository.revokeSession(found.sessionId);
    }
    if (accessToken && accessToken.length <= 4096) {
      try {
        const { sessionId } = await this.parseClaims(accessToken);
        await this.repository.revokeSession(sessionId);
      } catch {
        // Invalid token is fine — cookies are cleared anyway.
      }
    }
    return { message: 'Вы вышли из аккаунта.' };
  }

  async authenticate(token: string | undefined) {
    if (!token || token.length > 4096) {
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

  async verifyEmail(email: string, code: string) {
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
    await this.repository.$transaction(async (tx) => {
      await tx.emailCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { verifiedAt: new Date() },
      });
    });

    const refreshToken = randomToken();
    const session = await this.repository.createSession({
      userId: user.id,
      rememberMe: false,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS.short),
      tokenDigest: tokenDigest(refreshToken),
    });

    return this.credentials(user, session.id, refreshToken);
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
