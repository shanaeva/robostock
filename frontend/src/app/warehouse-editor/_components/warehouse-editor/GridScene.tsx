import { extend, useApplication } from '@pixi/react';
import { Container, TilingSprite } from 'pixi.js';
import { useLayoutEffect } from 'react';
import { ATLAS_SCALE, CELL_SIZE, CORNER_SIZE, MARGIN } from './constants';
import type { SceneProps } from './types';
import { sameCell } from './utils';
import { SceneElement } from './elements/SceneElement';
import { PlacementPreview } from './PlacementPreview';
import { useGridTextures } from './useGridTextures';
import { useGridHitTest } from './useGridHitTest';
import { useViewportSize } from './useViewportSize';

extend({ Container, TilingSprite });

export function GridScene({
  columns,
  rows,
  objects,
  preview,
  hitTestRef,
}: SceneProps) {
  const { app } = useApplication();
  const gridRef = useGridHitTest({ columns, rows, hitTestRef });
  const viewport = useViewportSize(app);
  const tiles = useGridTextures();
  const width = columns * CELL_SIZE;
  const height = rows * CELL_SIZE;
  const outerPadding = CORNER_SIZE + MARGIN;
  const scale = Math.min(
    1,
    viewport.width / (width + 2 * outerPadding),
    viewport.height / (height + 2 * outerPadding),
  );
  const x = [-CORNER_SIZE, 0, width, width + CORNER_SIZE];
  const y = [-CORNER_SIZE, 0, height, height + CORNER_SIZE];

  useLayoutEffect(() => {
    if (app?.renderer) {
      app.render();
    }
  }, [app, tiles, viewport, columns, rows, objects, preview]);

  return (
    <pixiContainer
      ref={gridRef}
      scale={scale}
      x={(viewport.width - width * scale) / 2}
      y={(viewport.height - height * scale) / 2}
    >
      {tiles.map(({ texture, column, row }) => (
        <pixiTilingSprite
          key={texture.uid}
          roundPixels
          texture={texture}
          x={x[column]}
          y={y[row]}
          width={x[column + 1] - x[column]}
          height={y[row + 1] - y[row]}
          tileScale={{ x: 1 / ATLAS_SCALE, y: 1 / ATLAS_SCALE }}
        />
      ))}
      {objects
        .filter((item) => item.column < columns && item.row < rows)
        .map(({ id, ...item }) => (
          <SceneElement key={id} {...item} />
        ))}
      {preview && preview.column < columns && preview.row < rows && (
        <PlacementPreview
          {...preview}
          blocked={objects.some((object) => sameCell(object, preview))}
        />
      )}
    </pixiContainer>
  );
}
