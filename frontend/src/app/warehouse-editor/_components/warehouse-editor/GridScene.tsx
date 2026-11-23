import { extend, useApplication } from '@pixi/react';
import { Container } from 'pixi.js';
import { useLayoutEffect, useMemo } from 'react';
import { CELL_SIZE, MARGIN, WALL_OUTSET } from './constants';
import type { SceneProps } from './types';
import { cellKey } from './layoutModel';
import { SceneElement } from './elements/SceneElement';
import { GridSurface } from './GridSurface';
import { PlacementPreview } from './PlacementPreview';
import { useGridHitTest } from './useGridHitTest';
import { useViewportSize } from './useViewportSize';

extend({ Container });

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
  const width = columns * CELL_SIZE;
  const height = rows * CELL_SIZE;
  const outerPadding = WALL_OUTSET + MARGIN;
  const scale = Math.min(
    1,
    viewport.width / (width + 2 * outerPadding),
    viewport.height / (height + 2 * outerPadding),
  );
  const hiddenKeys = preview?.hiddenKeys;
  const stationPreviews = preview?.stationPreviews;
  const placedElements = useMemo(() => {
    const elements = [];

    for (const [key, item] of objects) {
      if (
        !hiddenKeys?.includes(key) &&
        item.column < columns &&
        item.row < rows
      ) {
        elements.push(
          <SceneElement
            key={key}
            element={stationPreviews?.get(key) ?? item}
          />,
        );
      }
    }

    return elements;
  }, [objects, columns, rows, hiddenKeys, stationPreviews]);

  useLayoutEffect(() => {
    if (app?.renderer) {
      app.render();
    }
  }, [app, viewport, columns, rows, objects, preview]);

  return (
    <pixiContainer
      ref={gridRef}
      scale={scale}
      x={(viewport.width - width * scale) / 2}
      y={(viewport.height - height * scale) / 2}
    >
      <GridSurface width={width} height={height} scale={scale} />
      {placedElements}
      {preview?.elements.map((element) => (
        <PlacementPreview
          key={cellKey(element)}
          element={element}
          blocked={preview.blocked}
        />
      ))}
    </pixiContainer>
  );
}
