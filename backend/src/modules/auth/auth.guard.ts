import {
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { readCookie } from '../../common/cookies.js';
import type { Environment } from '../../config/environment.js';
import { safeEqual, verifyCsrf } from './auth.crypto.js';
import { AuthService } from './auth.service.js';

export interface AuthenticatedRequest extends Request {
  auth?: Awaited<ReturnType<AuthService['authenticate']>>;
}

class WindowLimiter {
  private readonly windows = new Map<
    string,
    { count: number; until: number }
  >();

  consume(
    key: string,
    limit: number,
    durationMs: number,
    now = Date.now(),
  ): boolean {
    const previous = this.windows.get(key);
    if (previous && previous.until > now) {
      if (previous.count >= limit) return false;
      previous.count += 1;
      return true;
    }
    if (this.windows.size >= 20_000) {
      for (const [k, v] of this.windows)
        if (v.until <= now) this.windows.delete(k);
      if (this.windows.size >= 20_000) return false;
    }
    this.windows.set(key, { count: 1, until: now + durationMs });
    return true;
  }
}

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly limiter = new WindowLimiter();
  private readonly csrfSecret: string;
  private readonly frontendOrigin: string | undefined;
  private readonly rateLimitEnabled: boolean;

  constructor(@Inject(ConfigService) config: ConfigService<Environment>) {
    this.csrfSecret = config.getOrThrow('CSRF_SECRET');
    this.frontendOrigin = config.get('FRONTEND_ORIGIN');
    this.rateLimitEnabled =
      config.getOrThrow('AUTH_RATE_LIMIT_ENABLED') === 'true';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

    if (this.rateLimitEnabled) {
      const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
      let allowed = this.limiter.consume(`global:${ip}`, 120, 60_000);
      if (unsafe) {
        allowed = this.limiter.consume(`auth-ip:${ip}`, 30, 60_000) && allowed;
        const body: unknown = request.body;
        const email: unknown =
          typeof body === 'object' && body !== null && 'email' in body
            ? body.email
            : undefined;
        if (typeof email === 'string' && email.length <= 254) {
          allowed =
            this.limiter.consume(
              `auth-email:${email.trim().toLowerCase()}`,
              10,
              15 * 60_000,
            ) && allowed;
        }
      }
      if (!allowed) {
        throw new HttpException(
          {
            message: 'Слишком много попыток. Подождите и попробуйте снова.',
            code: 'RATE_LIMITED',
          },
          429,
        );
      }
    }

    if (!unsafe) return true;

    const origin = request.get('origin');
    if (this.frontendOrigin && origin && origin !== this.frontendOrigin) {
      throw new ForbiddenException({
        message: 'Недопустимый источник запроса',
        code: 'CSRF_REJECTED',
      });
    }

    const cookie = readCookie(request, 'csrf_token');
    const header = request.get('x-csrf-token');
    if (
      !cookie ||
      !header ||
      !safeEqual(cookie, header) ||
      !verifyCsrf(this.csrfSecret, cookie)
    ) {
      throw new ForbiddenException({
        message: 'Обновите страницу и повторите действие.',
        code: 'CSRF_REJECTED',
      });
    }

    return true;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.auth = await this.auth.authenticate(
      readCookie(request, 'access_token'),
    );
    return true;
  }
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, 'access_token');
    if (token) {
      try {
        request.auth = await this.auth.authenticate(token);
      } catch {
        throw new UnauthorizedException('Сессия истекла. Войдите заново.');
      }
    }
    return true;
  }
}
