import type { z } from 'zod';
import { createHttpClient, HttpClientConfigurationError } from '@/shared/api';
import {
  warehouseListSchema,
  warehouseCreatedSchema,
  warehouseErrorSchema,
} from '../model/api-contract';
import { WarehouseApiError, getHttpErrorMessage } from './errors';
import type { WarehouseDataSource, WarehouseListParams } from './types';

export function createWarehouseHttpApi(
  baseUrl?: string,
  options: {
    beforeRequest?: () => Promise<void>;
    listHeaders?: (params: WarehouseListParams) => HeadersInit;
    errorMessage?: (status: number) => string | undefined;
  } = {},
): WarehouseDataSource {
  const client = createHttpClient(baseUrl);
  // Resolve lazily so a missing setting appears in the existing error UI,
  // rather than crashing Next.js prerendering or silently selecting mocks.
  function endpoint(relativePath: string) {
    try {
      return client.url(relativePath);
    } catch (error) {
      if (error instanceof HttpClientConfigurationError) {
        throw new WarehouseApiError(
          null,
          error.reason === 'missing-base-url'
            ? 'Для HTTP-режима задайте NEXT_PUBLIC_API_BASE_URL — адрес API.'
            : 'Адрес API должен быть HTTP(S) URL без логина, пароля, query и hash.',
        );
      }

      throw error;
    }
  }

  async function request(url: URL, init: RequestInit = {}) {
    await options.beforeRequest?.();

    let response: Response;
    try {
      response = await client.request(url, init);
    } catch (error) {
      if (init.signal?.aborted) {
        throw error;
      }

      throw new WarehouseApiError(
        null,
        'Не удалось связаться с сервером. Проверьте соединение и повторите попытку.',
      );
    }

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        // HTML, empty and malformed error bodies use the HTTP-status fallback.
      }
      const parsed = warehouseErrorSchema.safeParse(body);
      const useServerMessage =
        parsed.success &&
        parsed.data.statusCode === response.status &&
        ![401, 403].includes(response.status);

      throw new WarehouseApiError(
        response.status,
        useServerMessage
          ? parsed.data.message
          : (options.errorMessage?.(response.status) ??
              getHttpErrorMessage(response.status)),
      );
    }

    return response;
  }

  async function readJson<T>(
    response: Response,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new WarehouseApiError(
        response.status,
        'Сервер вернул пустой или некорректный ответ.',
      );
    }
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      throw new WarehouseApiError(
        response.status,
        'Ответ сервера не соответствует контракту складов.',
      );
    }

    return parsed.data;
  }

  return {
    mode: 'http',
    async list(params, signal) {
      const url = endpoint('warehouses');
      url.searchParams.set('search', params.search.trim());
      url.searchParams.set('page', String(params.page));
      url.searchParams.set('limit', String(params.limit));
      url.searchParams.set('sortBy', params.sortBy);
      url.searchParams.set('sortOrder', params.sortOrder);
      const response = await request(url, {
        method: 'GET',
        signal,
        ...(options.listHeaders
          ? { headers: options.listHeaders(params) }
          : {}),
      });

      // Zod strips unknown fields, including any uncontracted currentUserRole.
      return readJson(response, warehouseListSchema);
    },
    async create(input) {
      const response = await request(endpoint('warehouses'), {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          width: input.width,
          height: input.height,
        }),
      });

      return readJson(response, warehouseCreatedSchema);
    },
    async rename(id, input) {
      await request(endpoint(`warehouses/${encodeURIComponent(id)}`), {
        method: 'PATCH',
        body: JSON.stringify({ name: input.name }),
      });
      // OpenAPI: 204, no response body.
    },
    async remove(id) {
      await request(endpoint(`warehouses/${encodeURIComponent(id)}`), {
        method: 'DELETE',
      });
    },
  };
}
