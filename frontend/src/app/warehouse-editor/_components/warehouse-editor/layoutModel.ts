import type {
  FloorElement,
  GridCell,
  GridSide,
  GridSize,
  RobotState,
  SceneElementProps,
} from './types';

export const SIDES: readonly GridSide[] = ['north', 'east', 'south', 'west'];
const OFFSETS: Record<GridSide, GridCell> = {
  north: { column: 0, row: -1 },
  east: { column: 1, row: 0 },
  south: { column: 0, row: 1 },
  west: { column: -1, row: 0 },
};
export const OPPOSITE_SIDE: Record<GridSide, GridSide> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};
export const CLOCKWISE_SIDE: Record<GridSide, GridSide> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};

type RobotAssignment = { state: RobotState };
export type ChargingStation = GridCell & {
  kind: 'charger';
  robots: Partial<Record<GridSide, RobotAssignment>>;
  facing?: GridSide;
};
export type Fixture = ChargingStation | FloorElement;
export type WarehouseLayout = ReadonlyMap<string, Fixture>;
export type SceneObjects = ReadonlyMap<string, SceneElementProps>;

export function cellKey({ column, row }: GridCell) {
  return `${column},${row}`;
}

export function isInGrid(
  { column, row }: GridCell,
  { columns, rows }: GridSize,
) {
  return column >= 0 && column < columns && row >= 0 && row < rows;
}

export function adjacentCell(cell: GridCell, side: GridSide): GridCell {
  const offset = OFFSETS[side];

  return { column: cell.column + offset.column, row: cell.row + offset.row };
}

export function stationElement({
  column,
  row,
  robots,
  facing,
}: ChargingStation): SceneElementProps {
  return {
    kind: 'charger',
    column,
    row,
    facing,
    contactSides: SIDES.filter((side) => robots[side]),
  };
}

export function fixtureElements(fixture: Fixture): SceneElementProps[] {
  if (fixture.kind !== 'charger') {
    return [fixture];
  }

  const elements = [stationElement(fixture)];
  for (const side of SIDES) {
    const robot = fixture.robots[side];

    if (robot) {
      elements.push({
        ...adjacentCell(fixture, side),
        kind: 'robot',
        state: robot.state,
        contactSide: OPPOSITE_SIDE[side],
      });
    }
  }

  return elements;
}

export function getSceneObjects(layout: WarehouseLayout): SceneObjects {
  const objects = new Map<string, SceneElementProps>();

  for (const fixture of layout.values()) {
    for (const element of fixtureElements(fixture)) {
      objects.set(cellKey(element), element);
    }
  }

  return objects;
}

export function neighboringStations(layout: WarehouseLayout, cell: GridCell) {
  return SIDES.flatMap((side) => {
    const key = cellKey(adjacentCell(cell, OPPOSITE_SIDE[side]));
    const station = layout.get(key);

    return station?.kind === 'charger' ? [{ key, station, side }] : [];
  });
}

export function robotStation(layout: WarehouseLayout, cell: GridCell) {
  return neighboringStations(layout, cell).find(
    ({ station, side }) => station.robots[side],
  );
}
