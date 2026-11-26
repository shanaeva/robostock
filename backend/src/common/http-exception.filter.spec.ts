import {
  ForbiddenException,
  HttpException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter.js';

function run(exception: unknown) {
  const reply = vi.fn();
  const adapterHost = {
    httpAdapter: { reply },
  } as unknown as HttpAdapterHost;
  const host = {
    switchToHttp: () => ({ getResponse: () => ({}) }),
  } as unknown as ArgumentsHost;

  new HttpExceptionFilter(adapterHost).catch(exception, host);

  return reply.mock.calls[0] as [unknown, Record<string, unknown>, number];
}

describe('HttpExceptionFilter', () => {
  it('forwards a whitelisted machine code so the client can branch on it', () => {
    const [, body, status] = run(
      new ForbiddenException({
        message: 'Обновите страницу и повторите действие.',
        code: 'CSRF_REJECTED',
      }),
    );

    expect(status).toBe(403);
    expect(body).toEqual({
      statusCode: 403,
      message: 'Обновите страницу и повторите действие.',
      code: 'CSRF_REJECTED',
    });
  });

  it('omits code when the exception carries none', () => {
    const [, body] = run(new UnauthorizedException('Войдите в аккаунт'));

    expect(body).not.toHaveProperty('code');
  });

  it('drops an unknown code instead of passing it through', () => {
    const [, body] = run(
      new ForbiddenException({ message: 'no', code: 'SOMETHING_ELSE' }),
    );

    expect(body).not.toHaveProperty('code');
  });

  it('never leaks a code or message from a 5xx', () => {
    // The filter logs 5xx stacks by design; keep the test output clean.
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const [, body, status] = run(
      new HttpException({ message: 'db down', code: 'RATE_LIMITED' }, 500),
    );

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    vi.restoreAllMocks();
  });

  it('keeps the code on a 400 even though the message is normalized', () => {
    const [, body] = run(
      new HttpException({ message: 'details', code: 'INVALID_INPUT' }, 400),
    );

    expect(body).toMatchObject({ statusCode: 400, code: 'INVALID_INPUT' });
  });
});
