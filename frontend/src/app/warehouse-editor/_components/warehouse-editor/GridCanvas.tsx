import { Application } from '@pixi/react';
import { CANVAS_BACKGROUND } from './constants';
import type { SceneProps } from './types';
import { GridScene } from './GridScene';
import { useCanvasSession } from './useCanvasSession';

export function GridCanvas({ ...scene }: SceneProps) {
  const { session, ready, onInit } = useCanvasSession();

  if (!session) {
    return null;
  }

  return (
    <Application
      key={session}
      className="absolute inset-0 block"
      backgroundColor={CANVAS_BACKGROUND}
      resolution={window.devicePixelRatio}
      autoDensity
      autoStart={false}
      onInit={onInit}
    >
      {ready && <GridScene {...scene} />}
    </Application>
  );
}
