import type { GridCell } from '../types';
import { RollerPlatform } from './RollerPlatform';
export function ReceivingPlatform({ column, row }: GridCell) {
  return <RollerPlatform column={column} row={row} kind="receiving" />;
}
