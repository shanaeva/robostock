import type { Graphics, GraphicsContext } from 'pixi.js';
import { useCallback } from 'react';
import { CELL_SIZE, WALL_OUTSET } from './constants';
import { sharedDrawing } from './elements/drawing';

const FLOOR_OUTSET = 5;
const WALL_WIDTH = WALL_OUTSET - FLOOR_OUTSET;
const PANEL_LENGTH = CELL_SIZE * 2;
const DOT_SPACING = CELL_SIZE / 4;

const drawCorner = sharedDrawing((graphics) => {
  graphics.rect(0, 0, WALL_WIDTH, WALL_WIDTH).fill(0x687984);
  graphics.rect(1, 1, WALL_WIDTH - 2, WALL_WIDTH - 2).fill(0xafbec6);
  graphics.circle(WALL_WIDTH / 2, WALL_WIDTH / 2, 1.5).fill(0x697b85);
});

function drawWall(
  graphics: GraphicsContext,
  length: number,
  showDetails: boolean,
) {
  graphics.rect(0, 0, length, WALL_WIDTH).fill(0x72848e);
  graphics.rect(0, 1, length, 9.5).fill(0xc1ccd1);
  graphics.rect(0, 1.5, length, 1).fill(0xebf0f2);
  graphics.rect(0, 9.5, length, 1).fill(0x899aa5);
  graphics.rect(0, 12, length, WALL_WIDTH - 12).fill(0xe1e6e9);

  const firstJoint = PANEL_LENGTH - WALL_WIDTH;

  if (showDetails && firstJoint < length - 1) {
    for (let x = firstJoint; x < length - 1; x += PANEL_LENGTH) {
      graphics.rect(x - 0.5, 1, 2, 9.5);
    }
    graphics.fill(0x9baab2);
  }
}

type GridSurfaceProps = { width: number; height: number; scale: number };

export function GridSurface({ width, height, scale }: GridSurfaceProps) {
  // Skip fine details when they are too small to distinguish on screen.
  const showDetails = DOT_SPACING * scale >= 3;
  const drawSurface = useCallback(
    ({ context: graphics }: Graphics) => {
      const horizontal = width + 2 * FLOOR_OUTSET;
      const vertical = height + 2 * FLOOR_OUTSET;
      graphics.clear();
      graphics
        .rect(-FLOOR_OUTSET, -FLOOR_OUTSET, horizontal, vertical)
        .fill(0xf7f9fa);

      if (showDetails) {
        for (let y = DOT_SPACING / 2; y < height; y += DOT_SPACING) {
          for (let x = DOT_SPACING / 2; x < width; x += DOT_SPACING) {
            graphics.rect(x - 0.5, y - 0.5, 1, 1);
          }
        }
        graphics.fill(0xa9b8c2);
      }

      const walls = [
        { x: -FLOOR_OUTSET, y: -WALL_OUTSET, angle: 0, length: horizontal },
        {
          x: width + WALL_OUTSET,
          y: -FLOOR_OUTSET,
          angle: Math.PI / 2,
          length: vertical,
        },
        {
          x: width + FLOOR_OUTSET,
          y: height + WALL_OUTSET,
          angle: Math.PI,
          length: horizontal,
        },
        {
          x: -WALL_OUTSET,
          y: height + FLOOR_OUTSET,
          angle: -Math.PI / 2,
          length: vertical,
        },
      ];
      for (const { x, y, angle, length } of walls) {
        graphics.save().rotate(angle).translate(x, y);
        drawWall(graphics, length, showDetails);
        graphics.restore();
      }
    },
    [width, height, showDetails],
  );

  return (
    <>
      <pixiGraphics draw={drawSurface} />
      <pixiGraphics x={-WALL_OUTSET} y={-WALL_OUTSET} draw={drawCorner} />
      <pixiGraphics
        x={width + FLOOR_OUTSET}
        y={-WALL_OUTSET}
        draw={drawCorner}
      />
      <pixiGraphics
        x={-WALL_OUTSET}
        y={height + FLOOR_OUTSET}
        draw={drawCorner}
      />
      <pixiGraphics
        x={width + FLOOR_OUTSET}
        y={height + FLOOR_OUTSET}
        draw={drawCorner}
      />
    </>
  );
}
