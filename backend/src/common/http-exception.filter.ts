import { Catch, HttpException, Inject, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { ApiError } from './api-error.schema.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    let message =
      status === 503 ? 'Service unavailable' : 'Internal server error';

    if (exception instanceof HttpException && status < 500) {
      const response = exception.getResponse();
      const details: unknown =
        typeof response === 'string'
          ? response
          : 'message' in response
            ? response.message
            : exception.message;

      message =
        typeof details === 'string'
          ? details
          : Array.isArray(details)
            ? details
                .filter(
                  (item: unknown): item is string => typeof item === 'string',
                )
                .join('; ') || exception.message
            : exception.message;
    }

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

    const body: ApiError = { statusCode: status, message };
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse<unknown>(),
      body,
      status,
    );
  }
}
