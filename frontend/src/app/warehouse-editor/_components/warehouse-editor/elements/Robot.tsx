import { CELL_SIZE } from '../constants';
import type { RobotProps } from '../types';
import { sharedDrawing, verticalGradient } from './drawing';
const drawChassis = sharedDrawing((g) => {
  // Wheels, shell and electrical contacts.
  g.roundRect(0, 12, 4, 17, 1.2).fill(
    verticalGradient([0, 0x333a40], [1, 0x171c20]),
  );
  g.roundRect(36, 12, 4, 17, 1.2).fill(
    verticalGradient([0, 0x333a40], [1, 0x171c20]),
  );
  g.roundRect(3, 3, 34, 37, 6)
    .fill(verticalGradient([0, 0x50575e], [1, 0x353c43]))
    .stroke({ color: 0x252d34, width: 0.55, alignment: 1, alpha: 1 });
  g.roundRect(5, 7, 30, 30, 5)
    .fill(verticalGradient([0, 0x50565d], [1, 0x3e454c]))
    .stroke({ color: 0x667078, width: 0.5, alignment: 1, alpha: 1 });
  g.roundRect(10, 0, 20, 7, 1.5)
    .fill(verticalGradient([0, 0x31383f], [1, 0x414a52]))
    .stroke({ color: 0x252d34, width: 0.4, alignment: 1, alpha: 1 });
  g.roundRect(11.5, 0, 7, 3.7, 0.65)
    .fill(verticalGradient([0, 0xe5b74d], [0.5, 0xffdb80], [1, 0xb98d30]))
    .stroke({ color: 0x87631f, width: 0.35, alignment: 1, alpha: 1 });
  g.roundRect(21.5, 0, 7, 3.7, 0.65)
    .fill(verticalGradient([0, 0xe5b74d], [0.5, 0xffdb80], [1, 0xb98d30]))
    .stroke({ color: 0x87631f, width: 0.35, alignment: 1, alpha: 1 });
});
const drawChargingIndicator = sharedDrawing((g) => {
  g.poly([16, 21, 20, 17, 24, 21, 24, 22.8, 20, 19, 16, 22.8]).fill(
    verticalGradient([0, 0xc8ffed], [1, 0x6bd6b1]),
  );
});
const drawCargo = sharedDrawing((g) => {
  g.roundRect(11, 11, 18, 18, 1.45)
    .fill(verticalGradient([0, 0xf0c88b], [0.7, 0xdda865], [1, 0xcb9152]))
    .stroke({ color: 0x9e723f, width: 0.75, alignment: 1, alpha: 1 });
  g.roundRect(18.3, 11.6, 3.4, 16.7, 0.25).fill(0xf0cd99);
});
export function Robot({ column, row, state }: RobotProps) {
  const carrying = state === 'carrying';

  return (
    <pixiContainer
      x={(column + 0.5) * CELL_SIZE}
      y={(row + 0.5) * CELL_SIZE}
      pivot={{ x: CELL_SIZE / 2, y: CELL_SIZE / 2 }}
      angle={carrying ? 180 : 0}
    >
      <pixiGraphics draw={drawChassis} />
      {carrying ? (
        <pixiGraphics draw={drawCargo} />
      ) : (
        <pixiGraphics draw={drawChargingIndicator} />
      )}
    </pixiContainer>
  );
}
