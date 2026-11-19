import { useApplication } from '@pixi/react';
import type { Container } from 'pixi.js';
import { useLayoutEffect, useRef } from 'react';
import { cellAtPoint } from './cellAtPoint';
import { CELL_SIZE } from './constants';
import type { SceneProps } from './types';

export function useGridHitTest({
  columns,
  rows,
  hitTestRef,
}: Pick<SceneProps, 'columns' | 'rows' | 'hitTestRef'>) {
  const { app } = useApplication();
  const gridRef = useRef<Container>(null);

  useLayoutEffect(() => {
    hitTestRef.current = (clientX, clientY) => {
      const grid = gridRef.current;
      const renderer = app?.renderer;

      if (!renderer || !grid || !grid.scale.x || !grid.scale.y) {
        return null;
      }
      const bounds = renderer.canvas.getBoundingClientRect();

      if (!bounds.width || !bounds.height) {
        return null;
      }
      const local = grid.toLocal({
        x: ((clientX - bounds.left) * app.screen.width) / bounds.width,
        y: ((clientY - bounds.top) * app.screen.height) / bounds.height,
      });

      return cellAtPoint(local.x, local.y, { columns, rows }, CELL_SIZE);
    };

    return () => {
      hitTestRef.current = null;
    };
  }, [app, columns, rows, hitTestRef]);

  return gridRef;
}
