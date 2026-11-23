import type { GridSide } from './types';

export const DEFAULT_GRID_DIMENSION = 20;
export const CELL_SIZE = 40;
export const MARGIN = 48;
export const CANVAS_BACKGROUND = 0xffffff;

export const WALL_OUTSET = 20;
export const ROTATE_ICON_PATH = 'M20 7v5h-5m5 0a8 8 0 1 0-2.3 5.7';

export const ANGLE_FROM_NORTH: Record<GridSide, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};
