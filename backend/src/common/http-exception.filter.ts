import { Catch, HttpException, Inject, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { apiErrorCodeSchema } from './api-error.schema.js';
import type { ApiError, ApiErrorCode } from './api-error.schema.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message = this.resolveMessage(exception, status);

    if (status >= 500) {
      // Keep stack locations for debugging without logging error messages or SQL.
      const stack =
        exception instanceof Error
          ? exception.stack
              ?.split('\n')
              .filter((line) => line.trimStart().startsWith('at '))
              .join('\n')
          : undefined;
      this.logger.error('HTTP request failed', stack);
    }

    const code = this.resolveCode(exception, status);
    const body: ApiError = {
      statusCode: status,
      message,
      ...(code && { code }),
    };
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse<unknown>(),
      body,
      status,
    );
  }

  /**
   * Machine-readable code the client branches on (e.g. CSRF_REJECTED drives
   * the token refetch-and-retry). Only whitelisted codes from a 4xx
   * HttpException are forwarded, so 5xx internals never leak.
   */
  private resolveCode(
    exception: unknown,
    status: number,
  ): ApiErrorCode | undefined {
    if (!(exception instanceof HttpException) || status >= 500) {
      return undefined;
    }

    const response = exception.getResponse();

    if (typeof response !== 'object' || !('code' in response)) {
      return undefined;
    }

    const parsed = apiErrorCodeSchema.safeParse(response.code);

    return parsed.success ? parsed.data : undefined;
  }

  private resolveMessage(exception: unknown, status: number): string {
    if (status === 503) {
      return 'Service unavailable';
    }

    if (!(exception instanceof HttpException) || status >= 500) {
      return 'Internal server error';
    }

    if (status === 400) {
      return 'Некорректный JSON, параметры запроса или структура changes.';
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (!('message' in response)) {
      return exception.message;
    }

    const details: unknown = response.message;

    if (typeof details === 'string') {
      return details;
    }

    if (Array.isArray(details)) {
      const message = details
        .filter((item: unknown): item is string => typeof item === 'string')
        .join('; ');

      return message || exception.message;
    }

    return exception.message;
  }
}
