import type { SceneElementProps } from '../types';
import { ChargingStation } from './ChargingStation';
import { Rack } from './Rack';
import { ReceivingPlatform } from './ReceivingPlatform';
import { Robot } from './Robot';
import { ShippingPlatform } from './ShippingPlatform';

export function SceneElement({ kind, column, row, state }: SceneElementProps) {
  switch (kind) {
    case 'rack':
      return <Rack column={column} row={row} />;
    case 'robot':
      return <Robot column={column} row={row} state={state} />;
    case 'charger':
      return <ChargingStation column={column} row={row} />;
    case 'receiving':
      return <ReceivingPlatform column={column} row={row} />;
    case 'shipping':
      return <ShippingPlatform column={column} row={row} />;
  }
}
