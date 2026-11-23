import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cellAtPoint } from '../src/app/warehouse-editor/_components/warehouse-editor/cellAtPoint.ts';

const grid = { columns: 3, rows: 2 };
const hit = (x, y) => cellAtPoint(x, y, grid, 40);

test('includes the first and last cells of a rectangular grid', () => {
  assert.deepEqual(hit(0, 0), { column: 0, row: 0 });
  assert.deepEqual(hit(119.9, 79.9), { column: 2, row: 1 });
});

test('an internal boundary belongs to the next cell', () => {
  assert.deepEqual(hit(40, 40), { column: 1, row: 1 });
});

test('excludes the right and bottom edges and all four walls', () => {
  for (const [x, y] of [
    [120, 20],
    [20, 80],
    [-1, 20],
    [125, 20],
    [20, -1],
    [20, 85],
  ]) {
    assert.equal(hit(x, y), null, `(${x}, ${y})`);
  }
});
