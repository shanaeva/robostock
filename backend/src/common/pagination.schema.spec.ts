import { describe, expect, it } from 'vitest';
import { paginationSchema } from './pagination.schema.js';

describe('paginationSchema', () => {
  it('defaults to the first 20 records', () => {
    expect(paginationSchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('parses query parameters and accepts the maximum page size', () => {
    expect(paginationSchema.parse({ limit: '100', offset: '40' })).toEqual({
      limit: 100,
      offset: 40,
    });
  });

  it.each([
    { limit: '0' },
    { limit: '-1' },
    { limit: '101' },
    { limit: '1.5' },
    { limit: '' },
    { limit: 'invalid' },
    { limit: ['1', '2'] },
    { offset: '-1' },
    { offset: '1.5' },
    { offset: '2147483648' },
    { offset: 'Infinity' },
    { offset: 'invalid' },
    { offset: ['1', '2'] },
    { unknown: 'value' },
  ])('rejects invalid pagination (%#)', (input) => {
    expect(paginationSchema.safeParse(input).success).toBe(false);
  });
});
