import type { Graphics } from 'pixi.js';
import { CELL_SIZE } from './constants';
import type { SceneElementProps } from './types';
import { SceneElement } from './elements/SceneElement';

function highlight(graphics: Graphics, color: number) {
  graphics
    .clear()
    .rect(0, 0, CELL_SIZE, CELL_SIZE)
    .fill({ color, alpha: 0.16 })
    .stroke({ color, width: 2, alignment: 1 });
}
const available = (graphics: Graphics) => highlight(graphics, 0x087c63);
const occupied = (graphics: Graphics) => highlight(graphics, 0xc33838);

export function PlacementPreview({
  element,
  blocked,
}: {
  element: SceneElementProps;
  blocked: boolean;
}) {
  const { column, row } = element;

  return (
    <pixiContainer x={column * CELL_SIZE} y={row * CELL_SIZE}>
      <pixiGraphics draw={blocked ? occupied : available} />
      {!blocked && (
        <pixiContainer alpha={0.5}>
          <SceneElement element={element} cell={{ column: 0, row: 0 }} />
        </pixiContainer>
      )}
    </pixiContainer>
  );
}
