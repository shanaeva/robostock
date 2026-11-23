import type {
  GridCell,
  GridSide,
  GridSize,
  PlacementDrag,
  SceneElementProps,
  ScenePreview,
} from './types';
import {
  adjacentCell,
  cellKey,
  CLOCKWISE_SIDE,
  fixtureElements,
  isInGrid,
  neighboringStations,
  OPPOSITE_SIDE,
  robotStation,
  SIDES,
  stationElement,
  type ChargingStation,
  type Fixture,
  type SceneObjects,
  type WarehouseLayout,
} from './layoutModel.ts';

type FixtureUpdate = [key: string, fixture: Fixture | null];
export type LayoutChange = { updates: FixtureUpdate[] };
type PlacementPlan = Pick<
  ScenePreview,
  'elements' | 'hiddenKeys' | 'stationPreviews'
> &
  LayoutChange;

function planRobotPlacement(
  layout: WarehouseLayout,
  grid: GridSize,
  robot: SceneElementProps & { kind: 'robot' },
  originKey: string | null,
  target: GridCell,
): PlacementPlan | null {
  const origin = originKey ? robotStation(layout, robot) : undefined;

  if (originKey && !origin) {
    return null;
  }

  const neighbors = neighboringStations(layout, target).filter(({ station }) =>
    isInGrid(station, grid),
  );
  const destination = origin
    ? (neighbors.find(({ key }) => key === origin.key) ?? neighbors[0])
    : neighbors[0];

  if (!destination) {
    return null;
  }

  const robots = { ...destination.station.robots };
  const updates: [string, ChargingStation][] = [
    [destination.key, { ...destination.station, robots }],
  ];

  if (origin) {
    if (origin.key === destination.key) {
      delete robots[origin.side];
    } else {
      updates.push([
        origin.key,
        stationWithoutRobot(origin.station, origin.side),
      ]);
    }
  }

  robots[destination.side] = { state: robot.state };

  return {
    elements: [
      {
        ...robot,
        column: target.column,
        row: target.row,
        contactSide: OPPOSITE_SIDE[destination.side],
      },
    ],
    hiddenKeys: originKey ? [originKey] : [],
    stationPreviews: new Map(
      updates.map(([key, station]) => [key, stationElement(station)]),
    ),
    updates,
  };
}

export function planPlacement(
  layout: WarehouseLayout,
  objects: SceneObjects,
  grid: GridSize,
  { element, originKey }: PlacementDrag,
  target: GridCell,
): PlacementPlan | null {
  const targetKey = cellKey(target);

  if (!isInGrid(target, grid) || targetKey === originKey) {
    return null;
  }

  if (element.kind === 'robot') {
    return objects.has(targetKey)
      ? null
      : planRobotPlacement(layout, grid, element, originKey, target);
  }

  const source = originKey ? layout.get(originKey) : undefined;

  if (originKey && source?.kind !== element.kind) {
    return null;
  }

  const fixture: Fixture =
    element.kind === 'charger'
      ? { ...target, kind: 'charger', robots: {} }
      : { ...target, kind: element.kind };
  const next = source
    ? { ...source, column: target.column, row: target.row }
    : fixture;

  return planFixtureChange(objects, grid, next, source);
}

export function planStationRotation(
  layout: WarehouseLayout,
  objects: SceneObjects,
  grid: GridSize,
  stationKey: string,
): PlacementPlan | null {
  const station = layout.get(stationKey);

  if (station?.kind !== 'charger') {
    return null;
  }

  const robots: ChargingStation['robots'] = {};
  for (const side of SIDES) {
    const robot = station.robots[side];

    if (robot) {
      robots[CLOCKWISE_SIDE[side]] = robot;
    }
  }

  return planFixtureChange(
    objects,
    grid,
    {
      ...station,
      facing: CLOCKWISE_SIDE[station.facing ?? 'south'],
      robots,
    },
    station,
  );
}

export function planObjectRotation(
  layout: WarehouseLayout,
  objects: SceneObjects,
  grid: GridSize,
  key: string,
): PlacementPlan | null {
  const fixture = layout.get(key);

  if (fixture?.kind === 'charger') {
    return planStationRotation(layout, objects, grid, key);
  }

  if (fixture) {
    const quarterTurns = ((fixture.quarterTurns ?? 0) + 1) % 4;

    return planFixtureChange(
      objects,
      grid,
      { ...fixture, quarterTurns },
      fixture,
    );
  }

  const robot = objects.get(key);

  if (robot?.kind !== 'robot') {
    return null;
  }

  const origin = robotStation(layout, robot);

  if (!origin || !isInGrid(origin.station, grid)) {
    return null;
  }

  const target = adjacentCell(origin.station, CLOCKWISE_SIDE[origin.side]);

  return planPlacement(
    layout,
    objects,
    grid,
    { element: robot, originKey: key },
    target,
  );
}

function planFixtureChange(
  objects: SceneObjects,
  grid: GridSize,
  next: Fixture,
  source?: Fixture,
): PlacementPlan | null {
  const hiddenKeys = source ? fixtureElements(source).map(cellKey) : [];
  const elements = fixtureElements(next);

  if (
    elements.some((item) => {
      const key = cellKey(item);

      return (
        !isInGrid(item, grid) || (objects.has(key) && !hiddenKeys.includes(key))
      );
    })
  ) {
    return null;
  }

  const targetKey = cellKey(next);
  const updates: FixtureUpdate[] = [[targetKey, next]];

  if (source && cellKey(source) !== targetKey) {
    updates.unshift([cellKey(source), null]);
  }

  return { elements, hiddenKeys, updates };
}

export function planObjectRemoval(
  layout: WarehouseLayout,
  objects: SceneObjects,
  key: string,
): LayoutChange | null {
  const fixture = layout.get(key);

  if (
    fixture?.kind === 'charger' &&
    SIDES.some((side) => fixture.robots[side])
  ) {
    return null;
  }

  if (fixture) {
    return { updates: [[key, null]] };
  }

  const robot = objects.get(key);
  const origin =
    robot?.kind === 'robot' ? robotStation(layout, robot) : undefined;

  if (!origin) {
    return null;
  }

  return {
    updates: [[origin.key, stationWithoutRobot(origin.station, origin.side)]],
  };
}

function stationWithoutRobot(
  station: ChargingStation,
  side: GridSide,
): ChargingStation {
  const robots = { ...station.robots };
  delete robots[side];

  return { ...station, robots };
}

export function applyLayoutChange(
  layout: WarehouseLayout,
  change: LayoutChange | null,
) {
  if (!change) {
    return layout;
  }

  const next = new Map(layout);

  for (const [key, fixture] of change.updates) {
    if (fixture) {
      next.set(key, fixture);
    } else {
      next.delete(key);
    }
  }

  return next;
}
