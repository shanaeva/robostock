import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  userIdSchema,
  userResponseSchema,
  usersResponseSchema,
} from './users.schemas.js';

describe('user schemas', () => {
  it('accepts a valid request and trims the name', () => {
    expect(
      createUserSchema.parse({ email: 'test@example.com', name: ' Alex ' }),
    ).toEqual({ email: 'test@example.com', name: 'Alex' });
  });

  it.each([
    { email: 'invalid', name: 'Alex' },
    { name: 'Alex' },
    { email: 'test@example.com' },
    { email: 'test@example.com', name: '' },
    { email: 'test@example.com', name: '   ' },
    { email: 'test@example.com', name: 'x'.repeat(101) },
    { email: `${'x'.repeat(250)}@example.com`, name: 'Alex' },
    { email: null, name: 'Alex' },
    { email: 'test@example.com', name: 123 },
    { email: 'test@example.com', name: 'Alex', role: 'admin' },
    [],
    null,
  ])('rejects an invalid request (%#)', (input) => {
    expect(createUserSchema.safeParse(input).success).toBe(false);
  });

  it('accepts a UUID and rejects a malformed ID', () => {
    expect(
      userIdSchema.safeParse('b8ce249d-8a13-4bd0-8f19-acac66c7464e').success,
    ).toBe(true);
    expect(userIdSchema.safeParse('not-a-uuid').success).toBe(false);
  });

  it('requires an ISO date in the HTTP response', () => {
    const user = {
      id: 'b8ce249d-8a13-4bd0-8f19-acac66c7464e',
      email: 'test@example.com',
      name: 'Alex',
      createdAt: '2026-11-10T09:00:00.000Z',
    };
    expect(userResponseSchema.parse(user)).toEqual(user);
    expect(
      userResponseSchema.safeParse({ ...user, createdAt: 'invalid' }).success,
    ).toBe(false);
    expect(usersResponseSchema.parse([])).toEqual([]);
  });
});
