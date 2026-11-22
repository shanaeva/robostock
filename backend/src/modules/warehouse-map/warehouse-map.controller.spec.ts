import {
  ForbiddenException,
  NotFoundException,
  StandardSchemaValidationPipe,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from '../../common/http-exception.filter.js';
import { createCsrf } from '../auth/auth.crypto.js';
import { AuthGuard, SecurityGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { WarehouseMapController } from './warehouse-map.controller.js';
import type { BatchObjectChangesInput } from './warehouse-map.schemas.js';
import { WarehouseMapService } from './warehouse-map.service.js';

const WAREHOUSE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OBJECT_ID = '33333333-3333-4333-8333-333333333333';
const CSRF_SECRET = 'test-csrf-secret-with-at-least-32-characters';
const OTHER_SECRET = 'another-secret-with-at-least-32-characters';
const FRONTEND_ORIGIN = 'http://localhost:3000';
const ACCESS_TOKEN = 'valid-access-token';

const createObstacle = {
  type: 'create',
  objectType: 'obstacle',
  x: 1,
  y: 2,
} as const;
const moveRobot = {
  type: 'move',
  objectType: 'robot',
  objectId: OBJECT_ID,
  x: 3,
  y: 4,
} as const;

interface PatchOptions {
  cookies?: string[];
  csrfHeader?: string;
  origin?: string;
  query?: string;
}

describe('WarehouseMapController', () => {
  let app: INestApplication<Server>;
  let controller: WarehouseMapController;
  const applyChanges = vi.fn<WarehouseMapService['applyChanges']>();
  const authenticate = vi.fn<AuthService['authenticate']>();
  const csrf = createCsrf(CSRF_SECRET);

  // Authenticated, CSRF-protected request unless a part is overridden.
  const patch = (path: string, body: unknown, options: PatchOptions = {}) => {
    const {
      cookies = [`access_token=${ACCESS_TOKEN}`, `csrf_token=${csrf}`],
      csrfHeader = csrf,
      origin,
      query = '',
    } = options;
    const req = request(app.getHttpServer())
      .patch(`${path}${query}`)
      .set('Cookie', cookies.join('; '));

    if (csrfHeader) {
      req.set('X-CSRF-Token', csrfHeader);
    }

    if (origin) {
      req.set('Origin', origin);
    }

    return req.send(body as object);
  };
  const patchObjects = (body: unknown, options?: PatchOptions) =>
    patch(`/warehouses/${WAREHOUSE_ID}/objects`, body, options);

  beforeEach(async () => {
    applyChanges.mockReset();
    applyChanges.mockResolvedValue();
    authenticate.mockReset();
    authenticate.mockImplementation((token) =>
      token === ACCESS_TOKEN
        ? Promise.resolve({
            user: { id: USER_ID },
            sessionId: 'session-1',
          } as Awaited<ReturnType<AuthService['authenticate']>>)
        : Promise.reject(new UnauthorizedException('Войдите в аккаунт')),
    );
    const config: Record<string, string | undefined> = {
      CSRF_SECRET,
      FRONTEND_ORIGIN,
      AUTH_RATE_LIMIT_ENABLED: 'false',
    };
    const testingModule = await Test.createTestingModule({
      controllers: [WarehouseMapController],
      providers: [
        SecurityGuard,
        AuthGuard,
        { provide: AuthService, useValue: { authenticate } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => config[key],
            getOrThrow: (key: string) => config[key],
          },
        },
        { provide: WarehouseMapService, useValue: { applyChanges } },
        { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();
    app = testingModule.createNestApplication<INestApplication<Server>>({
      logger: false,
    });
    await app.init();
    controller = testingModule.get(WarehouseMapController);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards the authenticated user id and the changes to the service', async () => {
    const input: BatchObjectChangesInput = {
      changes: [createObstacle, moveRobot],
    };
    const authenticated = {
      auth: { user: { id: USER_ID }, sessionId: 'session-1' },
    } as AuthenticatedRequest;

    await controller.applyChanges(WAREHOUSE_ID, input, authenticated);

    expect(applyChanges).toHaveBeenCalledExactlyOnceWith(
      WAREHOUSE_ID,
      USER_ID,
      input.changes,
    );
  });

  it('refuses to call the service without an auth context', () => {
    expect(() =>
      controller.applyChanges(
        WAREHOUSE_ID,
        { changes: [createObstacle] },
        {} as AuthenticatedRequest,
      ),
    ).toThrow(UnauthorizedException);
    expect(applyChanges).not.toHaveBeenCalled();
  });

  describe('authentication and CSRF', () => {
    it('forwards the session user id over HTTP', async () => {
      const response = await patchObjects({ changes: [createObstacle] });

      expect(response.status).toBe(204);
      expect(authenticate).toHaveBeenCalledExactlyOnceWith(ACCESS_TOKEN);
      expect(applyChanges).toHaveBeenCalledExactlyOnceWith(
        WAREHOUSE_ID,
        USER_ID,
        [createObstacle],
      );
    });

    it('ignores a user id supplied in the query string', async () => {
      const response = await patchObjects(
        { changes: [createObstacle] },
        { query: `?userId=${OTHER_USER_ID}` },
      );

      expect(response.status).toBe(204);
      expect(applyChanges.mock.calls[0]?.[1]).toBe(USER_ID);
    });

    it('rejects a user id supplied in the body', async () => {
      const response = await patchObjects({
        changes: [createObstacle],
        userId: OTHER_USER_ID,
      });

      expect(response.status).toBe(400);
      expect(applyChanges).not.toHaveBeenCalled();
    });

    it('accepts a matching Origin header', async () => {
      const response = await patchObjects(
        { changes: [createObstacle] },
        { origin: FRONTEND_ORIGIN },
      );

      expect(response.status).toBe(204);
    });

    it.each([
      ['a missing access token', [`csrf_token=${csrf}`]],
      [
        'an invalid access token',
        ['access_token=forged', `csrf_token=${csrf}`],
      ],
    ])('returns 401 for %s', async (_name, cookies) => {
      const response = await patchObjects(
        { changes: [createObstacle] },
        { cookies },
      );

      expect(response.status).toBe(401);
      expect(applyChanges).not.toHaveBeenCalled();
    });

    it('returns 401 before validating the body when unauthenticated', async () => {
      const response = await patchObjects(
        {},
        { cookies: [`csrf_token=${csrf}`] },
      );

      expect(response.status).toBe(401);
      expect(applyChanges).not.toHaveBeenCalled();
    });

    it.each<[string, PatchOptions]>([
      ['a missing CSRF cookie', { cookies: [`access_token=${ACCESS_TOKEN}`] }],
      ['a missing CSRF header', { csrfHeader: '' }],
      ['a mismatched CSRF header', { csrfHeader: createCsrf(CSRF_SECRET) }],
      [
        'a CSRF token signed with another secret',
        {
          cookies: [
            `access_token=${ACCESS_TOKEN}`,
            `csrf_token=${createCsrf(OTHER_SECRET)}`,
          ],
          csrfHeader: createCsrf(OTHER_SECRET),
        },
      ],
      ['a foreign Origin', { origin: 'https://evil.example' }],
    ])('returns 403 for %s', async (_name, options) => {
      const response = await patchObjects(
        { changes: [createObstacle] },
        options,
      );

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        statusCode: 403,
      });
      expect(authenticate).not.toHaveBeenCalled();
      expect(applyChanges).not.toHaveBeenCalled();
    });
  });

  it('returns 204 with an empty body and forwards the parsed request', async () => {
    const response = await patchObjects({ changes: [createObstacle] });

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(applyChanges).toHaveBeenCalledTimes(1);
    const [warehouseId, , changes] = applyChanges.mock.calls[0] ?? [];
    expect(warehouseId).toBe(WAREHOUSE_ID);
    expect(changes).toEqual([createObstacle]);
  });

  it('accepts robot movement', async () => {
    const response = await patchObjects({ changes: [moveRobot] });

    expect(response.status).toBe(204);
    expect(applyChanges.mock.calls[0]?.[2]).toEqual([moveRobot]);
  });

  it.each([
    ['a missing changes field', {}],
    ['an empty batch', { changes: [] }],
    ['more than 400 changes', { changes: Array(401).fill(createObstacle) }],
    ['an extra top-level field', { changes: [createObstacle], extra: true }],
    ['an extra operation field', { changes: [{ ...createObstacle, z: 1 }] }],
    ['a non-integer coordinate', { changes: [{ ...createObstacle, x: 1.5 }] }],
    ['an unsupported operation type', { changes: [{ type: 'update' }] }],
    [
      'an unsupported object type',
      { changes: [{ ...createObstacle, objectType: 'wall' }] },
    ],
    [
      'a move without objectType',
      { changes: [{ type: 'move', objectId: OBJECT_ID, x: 1, y: 1 }] },
    ],
    [
      'a robot created without coordinates',
      { changes: [{ type: 'create', objectType: 'robot', name: 'R' }] },
    ],
  ])('returns 400 for %s', async (_name, body) => {
    const response = await patchObjects(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400 });
    expect(applyChanges).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-UUID warehouse id', async () => {
    const response = await patch('/warehouses/not-a-uuid/objects', {
      changes: [createObstacle],
    });

    expect(response.status).toBe(400);
    expect(applyChanges).not.toHaveBeenCalled();
  });

  it.each([
    [403, new ForbiddenException('Warehouse belongs to another user')],
    [404, new NotFoundException('Warehouse not found')],
    [422, new UnprocessableEntityException('Cell is already occupied')],
  ])('propagates a %s from the service', async (status, error) => {
    applyChanges.mockRejectedValue(error);

    const response = await patchObjects({ changes: [createObstacle] });

    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      statusCode: status,
      message: error.message,
    });
  });

  it('hides unexpected service failures behind a 500', async () => {
    applyChanges.mockRejectedValue(new Error('connection string leaked'));

    const response = await patchObjects({ changes: [createObstacle] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
