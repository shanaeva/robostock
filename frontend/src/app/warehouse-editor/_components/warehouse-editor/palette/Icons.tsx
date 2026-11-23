import { extend, useApplication } from '@pixi/react';
import { Container } from 'pixi.js';
import { useLayoutEffect } from 'react';
import { CELL_SIZE } from '../constants';
import { SceneElement } from '../elements/SceneElement';
import { createSceneElement } from '../utils';
import { PixiCanvas } from '../PixiCanvas';
import {
  PALETTE_ELEMENTS,
  PALETTE_ROW_HEIGHT,
  PREVIEW_WIDTH,
} from './constants';

extend({ Container });

function IconList() {
  const { app } = useApplication();
  useLayoutEffect(() => {
    if (app?.renderer) {
      app.render();
    }
  }, [app]);

  return PALETTE_ELEMENTS.map(({ id }, index) => (
    <pixiContainer
      key={id}
      y={index * PALETTE_ROW_HEIGHT + (PALETTE_ROW_HEIGHT - CELL_SIZE) / 2}
    >
      <SceneElement element={createSceneElement(id, { column: 0, row: 0 })} />
    </pixiContainer>
  ));
}

export function Icons() {
  return (
    <PixiCanvas
      width={PREVIEW_WIDTH}
      height={PALETTE_ELEMENTS.length * PALETTE_ROW_HEIGHT}
      backgroundAlpha={0}
      antialias
    >
      <IconList />
    </PixiCanvas>
  );
}
