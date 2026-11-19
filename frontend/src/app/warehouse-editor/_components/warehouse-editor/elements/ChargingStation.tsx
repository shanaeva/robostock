import { CELL_SIZE } from '../constants';
import type { GridCell } from '../types';
import { sharedDrawing, verticalGradient } from './drawing';
const drawChargingStation = sharedDrawing((g) => {
  // Housing and front panel.
  g.poly([6, 0, 34, 0, 40, 6, 40, 34, 34, 40, 6, 40, 0, 34, 0, 6])
    .fill(verticalGradient([0, 0x48525b], [1, 0x34393e]))
    .stroke({ color: 0x242d34, width: 0.55, alignment: 1, alpha: 1 });
  g.poly([0, 12, 3.5, 15, 3.5, 26, 0, 29]).fill(
    verticalGradient([0, 0xafccde], [1, 0x7897aa]),
  );
  g.poly([40, 12, 36.5, 15, 36.5, 26, 40, 29]).fill(
    verticalGradient([0, 0xafccde], [1, 0x7897aa]),
  );
  g.poly([8, 2, 32, 2, 37, 7, 37, 29, 32, 34, 8, 34, 3, 29, 3, 7])
    .fill(verticalGradient([0, 0xfbfbfc], [1, 0xdfe2e5]))
    .stroke({ color: 0xfdfeff, width: 0.6, alignment: 1, alpha: 1 });
  // Indicators, lightning bolt and charging contacts.
  g.roundRect(12.25, 9, 6, 1.65, 0.8)
    .fill(verticalGradient([0, 0x9dffe0], [1, 0x55c9a3]))
    .stroke({ color: 0x65a48d, width: 0.3, alignment: 1, alpha: 1 });
  g.roundRect(21.75, 9, 6, 1.65, 0.8)
    .fill(verticalGradient([0, 0x9dffe0], [1, 0x55c9a3]))
    .stroke({ color: 0x65a48d, width: 0.3, alignment: 1, alpha: 1 });
  g.poly([21, 15, 17, 21, 19.6, 21, 18.9, 25, 23, 19, 20.6, 19]).fill(
    verticalGradient([0, 0x7f8991], [1, 0x4e5963]),
  );
  g.roundRect(10, 34.2, 20, 5.8, 1.5)
    .fill(verticalGradient([0, 0x30373c], [1, 0x1d2429]))
    .stroke({ color: 0x535e66, width: 0.55, alignment: 1, alpha: 1 });
  g.roundRect(11.5, 36.3, 7, 3.7, 0.65)
    .fill(verticalGradient([0, 0xa47a2a], [0.5, 0xf9d772], [1, 0xd5a33c]))
    .stroke({ color: 0x87631f, width: 0.35, alignment: 1, alpha: 1 });
  g.roundRect(21.5, 36.3, 7, 3.7, 0.65)
    .fill(verticalGradient([0, 0xa47a2a], [0.5, 0xf9d772], [1, 0xd5a33c]))
    .stroke({ color: 0x87631f, width: 0.35, alignment: 1, alpha: 1 });
});
export function ChargingStation({ column, row }: GridCell) {
  return (
    <pixiGraphics
      x={column * CELL_SIZE}
      y={row * CELL_SIZE}
      draw={drawChargingStation}
    />
  );
}
