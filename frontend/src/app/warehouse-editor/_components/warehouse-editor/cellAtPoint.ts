import type { GridCell, GridSize } from './types';

export function cellAtPoint(
  x: number,
  y: number,
  { columns, rows }: GridSize,
  cellSize: number,
): GridCell | null {
  const column = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);

  return column >= 0 && column < columns && row >= 0 && row < rows
    ? { column, row }
    : null;
}
