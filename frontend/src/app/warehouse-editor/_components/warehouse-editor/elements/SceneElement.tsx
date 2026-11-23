import { CELL_SIZE } from '../constants';
import type { GridCell, SceneElementProps } from '../types';
import { ChargingStation } from './ChargingStation';
import { Rack } from './Rack';
import { ReceivingPlatform } from './ReceivingPlatform';
import { Robot } from './Robot';
import { ShippingPlatform } from './ShippingPlatform';

const FLOOR_SHAPES = {
  rack: Rack,
  receiving: ReceivingPlatform,
  shipping: ShippingPlatform,
};

export function SceneElement({
  element,
  cell = element,
}: {
  element: SceneElementProps;
  cell?: GridCell;
}) {
  const { column, row } = cell;

  switch (element.kind) {
    case 'robot':
      return (
        <Robot
          column={column}
          row={row}
          state={element.state}
          contactSide={element.contactSide}
        />
      );
    case 'charger':
      return (
        <ChargingStation
          column={column}
          row={row}
          contactSides={element.contactSides}
          facing={element.facing}
        />
      );
  }

  const Shape = FLOOR_SHAPES[element.kind];

  return (
    <pixiContainer
      x={(column + 0.5) * CELL_SIZE}
      y={(row + 0.5) * CELL_SIZE}
      pivot={{ x: CELL_SIZE / 2, y: CELL_SIZE / 2 }}
      angle={(element.quarterTurns ?? 0) * 90}
    >
      <Shape column={0} row={0} />
    </pixiContainer>
  );
}
