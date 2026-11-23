import { CELL_SIZE } from '../constants';
import type { RollerPlatformProps } from '../types';
import { sharedDrawing, verticalGradient } from './drawing';
const drawRollers = sharedDrawing((g) => {
  g.roundRect(0, 0, 40, 40, 2.1)
    .fill(0x748a96)
    .stroke({ color: 0x546975, width: 0.8, alignment: 1, alpha: 1 });
  g.roundRect(3, 1, 34, 26, 1).fill(0x5c6c77);
  const rollerFill = verticalGradient(
    [0, 0x758792],
    [0.22, 0xd2dbe0],
    [0.43, 0xf2f5f6],
    [0.72, 0xbdcbd2],
    [1, 0x8396a1],
  );
  for (const y of [1.4, 7.7, 14, 20.3]) {
    g.roundRect(3.2, y, 33.6, 5.95, 1.6).fill(rollerFill);
  }
});
const drawRails = sharedDrawing((g) => {
  g.roundRect(0.4, 0.4, 3.8, 39.2, 1.25)
    .fill(
      verticalGradient(
        [0, 0x72909e],
        [0.3, 0xd8e3e9],
        [0.55, 0xaec2cd],
        [1, 0x657e8c],
      ),
    )
    .stroke({ color: 0x637a86, width: 0.55, alignment: 1, alpha: 1 });
  g.roundRect(1.45, 2, 1.7, 1.7, 0.8).fill(0x758a96);
  g.roundRect(1.45, 36.2, 1.7, 1.7, 0.8).fill(0x758a96);
  g.roundRect(35.8, 0.4, 3.8, 39.2, 1.25)
    .fill(
      verticalGradient(
        [0, 0x72909e],
        [0.3, 0xd8e3e9],
        [0.55, 0xaec2cd],
        [1, 0x657e8c],
      ),
    )
    .stroke({ color: 0x637a86, width: 0.55, alignment: 1, alpha: 1 });
  g.roundRect(36.85, 2, 1.7, 1.7, 0.8).fill(0x758a96);
  g.roundRect(36.85, 36.2, 1.7, 1.7, 0.8).fill(0x758a96);
});
const drawReceivingPanel = sharedDrawing((g) => {
  g.roundRect(3.3, 26.7, 33.4, 12.1, 0.8)
    .fill(0xd9e9e7)
    .stroke({ color: 0x97a8b1, width: 0.55, alignment: 1, alpha: 1 });
  g.poly([
    18.5, 28.75, 21.5, 28.75, 21.5, 32.45, 24.5, 32.45, 20, 36.95, 15.5, 32.45,
    18.5, 32.45,
  ]).fill(0x197e7a);
});
const drawShippingPanel = sharedDrawing((g) => {
  g.roundRect(3.3, 26.7, 33.4, 12.1, 0.8)
    .fill(0xe7e2ef)
    .stroke({ color: 0x97a8b1, width: 0.55, alignment: 1, alpha: 1 });
  g.poly([
    18.5, 36.95, 21.5, 36.95, 21.5, 33.25, 24.5, 33.25, 20, 28.75, 15.5, 33.25,
    18.5, 33.25,
  ]).fill(0x7352a8);
});
export function RollerPlatform({ column, row, kind }: RollerPlatformProps) {
  return (
    <pixiContainer x={column * CELL_SIZE} y={row * CELL_SIZE}>
      <pixiGraphics draw={drawRollers} />
      <pixiGraphics
        draw={kind === 'receiving' ? drawReceivingPanel : drawShippingPanel}
      />
      <pixiGraphics draw={drawRails} />
    </pixiContainer>
  );
}
