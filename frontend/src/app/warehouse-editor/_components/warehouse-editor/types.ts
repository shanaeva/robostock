import type { PointerEvent, RefObject } from 'react';

export type GridCell = { column: number; row: number };
export type GridSide = 'north' | 'east' | 'south' | 'west';
export type RobotState = 'idle' | 'charging' | 'carrying';
export type RobotProps = GridCell & {
  state: RobotState;
  contactSide?: GridSide;
};
export type ChargingStationProps = GridCell & {
  contactSides?: readonly GridSide[];
  facing?: GridSide;
};
export type RollerPlatformProps = GridCell & { kind: 'receiving' | 'shipping' };

export type GridSize = { columns: number; rows: number };

export type ElementKind =
  'rack' | 'robot' | 'charger' | 'receiving' | 'shipping';
export type EditorTool = 'move' | 'rotate';
export type FloorElement = GridCell & {
  kind: Exclude<ElementKind, 'robot' | 'charger'>;
  quarterTurns?: number;
};
export type PaletteElement = { id: ElementKind; label: string };
export type SceneElementProps =
  | (RobotProps & { kind: 'robot' })
  | (ChargingStationProps & { kind: 'charger' })
  | FloorElement;
export type PlacementDrag = {
  element: SceneElementProps;
  originKey: string | null;
};
export type SceneDrop = PlacementDrag & { rotateOnRelease: boolean };
export type ActiveDrag = SceneDrop & {
  pointerId: number;
  source: Element;
};
export type ScenePreview = {
  elements: SceneElementProps[];
  hiddenKeys: string[];
  blocked: boolean;
  stationPreviews?: ReadonlyMap<string, SceneElementProps>;
};
export type HitTest = (clientX: number, clientY: number) => GridCell | null;
export type SceneProps = GridSize & {
  hitTestRef: RefObject<HitTest | null>;
  objects: ReadonlyMap<string, SceneElementProps>;
  preview: ScenePreview | null;
};
export type PaletteDragHandlers = {
  start: (event: PointerEvent, kind: ElementKind) => void;
  move: (event: PointerEvent) => void;
  drop: (event: PointerEvent) => void;
  cancel: (event: PointerEvent) => void;
};

export type WarehouseEditorProps = Partial<GridSize>;
