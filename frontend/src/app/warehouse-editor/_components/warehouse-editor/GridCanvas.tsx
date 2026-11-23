import { CANVAS_BACKGROUND } from './constants';
import type { SceneProps } from './types';
import { GridScene } from './GridScene';
import { PixiCanvas } from './PixiCanvas';

export function GridCanvas({
  columns,
  rows,
  objects,
  preview,
  hitTestRef,
}: SceneProps) {
  return (
    <PixiCanvas
      className="absolute inset-0 block"
      backgroundColor={CANVAS_BACKGROUND}
      antialias
    >
      <GridScene
        columns={columns}
        rows={rows}
        objects={objects}
        preview={preview}
        hitTestRef={hitTestRef}
      />
    </PixiCanvas>
  );
}
