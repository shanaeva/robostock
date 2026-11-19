import { CELL_SIZE } from '../constants';
import type { GridCell } from '../types';
import { sharedDrawing, verticalGradient } from './drawing';
const drawRack = sharedDrawing((g) => {
  g.roundRect(1.5, 1.5, 37, 37, 0.2).fill(
    verticalGradient([0, 0xc3ccd3], [1, 0xa6b1ba]),
  );
  // Cartons and packing tape.
  g.roundRect(2.5, 2.5, 17, 35, 0.6)
    .fill(verticalGradient([0, 0xe4b276], [0.5, 0xd3a064], [1, 0xb7864c]))
    .stroke({ color: 0x966d3d, width: 0.3, alignment: 1, alpha: 1 });
  g.roundRect(2.9, 2.9, 16.2, 34.2, 0.4).stroke({
    color: 0xf0d3a8,
    width: 0.25,
    alignment: 1,
    alpha: 0.6,
  });
  g.roundRect(9.6, 2.75, 2.8, 34.5, 0.1).fill({ color: 0xebcfa6, alpha: 0.8 });
  g.roundRect(20.5, 2.5, 17, 17, 0.6)
    .fill(verticalGradient([0, 0xe4b276], [0.5, 0xd3a064], [1, 0xb7864c]))
    .stroke({ color: 0x966d3d, width: 0.3, alignment: 1, alpha: 1 });
  g.roundRect(20.9, 2.9, 16.2, 16.2, 0.4).stroke({
    color: 0xf0d3a8,
    width: 0.25,
    alignment: 1,
    alpha: 0.6,
  });
  g.roundRect(27.6, 2.75, 2.8, 16.5, 0.1).fill({ color: 0xebcfa6, alpha: 0.8 });
  g.roundRect(20.5, 20.5, 17, 17, 0.6)
    .fill(verticalGradient([0, 0xe4b276], [0.5, 0xd3a064], [1, 0xb7864c]))
    .stroke({ color: 0x966d3d, width: 0.3, alignment: 1, alpha: 1 });
  g.roundRect(20.9, 20.9, 16.2, 16.2, 0.4).stroke({
    color: 0xf0d3a8,
    width: 0.25,
    alignment: 1,
    alpha: 0.6,
  });
  g.roundRect(27.6, 20.75, 2.8, 16.5, 0.1).fill({
    color: 0xebcfa6,
    alpha: 0.8,
  });
  // Steel rails and corner posts.
  g.rect(0, 1.1, 40, 1.4)
    .fill(verticalGradient([0, 0xd4dde3], [0.5, 0x7f909d], [1, 0xb5c1ca]))
    .stroke({ color: 0x788a98, width: 0.25, alignment: 1, alpha: 1 });
  g.rect(0, 37.5, 40, 1.4)
    .fill(verticalGradient([0, 0xd4dde3], [0.5, 0x7f909d], [1, 0xb5c1ca]))
    .stroke({ color: 0x788a98, width: 0.25, alignment: 1, alpha: 1 });
  g.rect(1.1, 0, 1.4, 40)
    .fill(verticalGradient([0, 0xd4dde3], [0.5, 0x7f909d], [1, 0xb5c1ca]))
    .stroke({ color: 0x788a98, width: 0.25, alignment: 1, alpha: 1 });
  g.rect(37.5, 0, 1.4, 40)
    .fill(verticalGradient([0, 0xd4dde3], [0.5, 0x7f909d], [1, 0xb5c1ca]))
    .stroke({ color: 0x788a98, width: 0.25, alignment: 1, alpha: 1 });
  for (const x of [0, 37]) {
    for (const y of [0, 37]) {
      g.save().translate(x, y);
      g.roundRect(0, 0, 3, 3, 0.25)
        .fill(verticalGradient([0, 0x9dafbd], [1, 0x5f7789]))
        .stroke({ color: 0x4b6374, width: 0.3, alignment: 1, alpha: 1 });
      g.roundRect(0.7, 0.65, 1.6, 1.7, 0.1)
        .fill(0x30414e)
        .stroke({ color: 0xb1c0cb, width: 0.15, alignment: 1, alpha: 1 });
      g.restore();
    }
  }
});
export function Rack({ column, row }: GridCell) {
  return (
    <pixiGraphics x={column * CELL_SIZE} y={row * CELL_SIZE} draw={drawRack} />
  );
}
