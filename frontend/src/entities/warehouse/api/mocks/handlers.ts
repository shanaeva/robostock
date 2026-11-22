import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { WarehouseApiError } from '../errors';
import { defaultWarehouseListParams } from '../types';
import {
  warehouseDemoRoleHeader,
  warehouseMockDelayMs,
  warehouseMockOrigin,
  type WarehouseMockSession,
} from './session';

const paramsSchema = z.object({
  search: z.string().default(defaultWarehouseListParams.search),
  page: z.coerce.number().int().min(1).default(defaultWarehouseListParams.page),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(defaultWarehouseListParams.limit),
  sortBy: z
    .enum(['id', 'name', 'width', 'height'])
    .default(defaultWarehouseListParams.sortBy),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default(defaultWarehouseListParams.sortOrder),
});
const roleSchema = z.enum(['Owner', 'Observer']).optional();

export function createWarehouseHandlers(
  session: WarehouseMockSession,
  delayMs = warehouseMockDelayMs,
) {
  const endpoint = (path: string) => new URL(path, session.baseUrl).href;

  async function respond(action: () => Response | Promise<Response>) {
    if (delayMs > 0) {
      await delay(delayMs);
    }

    try {
      return await action();
    } catch (error) {
      if (error instanceof WarehouseApiError) {
        const statusCode = error.status ?? 500;

        return HttpResponse.json(
          { statusCode, message: error.message },
          { status: statusCode },
        );
      }

      if (error instanceof z.ZodError) {
        return HttpResponse.json(
          { statusCode: 400, message: error.issues[0].message },
          { status: 400 },
        );
      }

      throw error;
    }
  }

  async function readBody(request: Request): Promise<unknown> {
    try {
      return await request.json();
    } catch {
      throw new WarehouseApiError(400, 'Некорректное тело запроса.');
    }
  }

  return [
    http.get(endpoint('warehouses'), ({ request }) =>
      respond(() => {
        const params = paramsSchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        );
        const role = roleSchema.parse(
          request.headers.get(warehouseDemoRoleHeader) ?? undefined,
        );
        const result = session.store.list({ ...params, role });

        // The body is the real DTO. Demo roles never become server-contract fields.
        return HttpResponse.json({
          ...result,
          list: result.list.map(({ id, name, width, height }) => ({
            id,
            name,
            width,
            height,
          })),
        });
      }),
    ),
    http.post(endpoint('warehouses'), ({ request }) =>
      respond(async () => {
        const created = session.store.create(await readBody(request));

        return HttpResponse.json(created, { status: 201 });
      }),
    ),
    http.patch(endpoint('warehouses/:warehouseId'), ({ params, request }) =>
      respond(async () => {
        session.store.rename(
          String(params.warehouseId),
          await readBody(request),
        );

        return new HttpResponse(null, { status: 204 });
      }),
    ),
    http.delete(endpoint('warehouses/:warehouseId'), ({ params }) =>
      respond(() => {
        session.store.remove(String(params.warehouseId));

        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}

// Fail closed for a disposed mock session; this can never match a real API URL.
export const warehouseMockFallback = http.all(
  new RegExp(
    `^${warehouseMockOrigin.replaceAll('.', '\\.')}\\/[^/]+\\/warehouses(?:\\/[^/?]+)?(?:\\?.*)?$`,
  ),
  () =>
    HttpResponse.json(
      {
        statusCode: 503,
        message: 'Моковый сеанс склада завершён. Перезагрузите страницу.',
      },
      { status: 503 },
    ),
);
