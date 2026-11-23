import { DEFAULT_GRID_DIMENSION } from './constants';
import type { ElementKind, GridCell, SceneElementProps } from './types';

export function createSceneElement(
  kind: ElementKind,
  cell: GridCell,
): SceneElementProps {
  return kind === 'robot'
    ? { ...cell, kind, state: 'idle' }
    : { ...cell, kind };
}

export function resolveDimension(value = DEFAULT_GRID_DIMENSION) {
  return Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_GRID_DIMENSION;
}

export function sameCell(a: GridCell, b: GridCell) {
  return a.column === b.column && a.row === b.row;
}
