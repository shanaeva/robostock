export const DEFAULT_GRID_DIMENSION = 20;
export const CELL_SIZE = 40;
export const MARGIN = 48;
export const CANVAS_BACKGROUND = 0xffffff;

// Atlas slice dimensions are in logical pixels. The image is exported at 2×.
export const ATLAS_SCALE = 2;
export const CORNER_SIZE = 20;
const PANEL_SIZE = 80;
export const SLICES = [
  { offset: 0, size: CORNER_SIZE },
  { offset: CORNER_SIZE, size: PANEL_SIZE },
  { offset: CORNER_SIZE + PANEL_SIZE, size: CORNER_SIZE },
] as const;
