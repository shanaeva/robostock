import type { Texture } from 'pixi.js';
import type { PointerEvent, RefObject } from 'react';

export type GridCell = { column: number; row: number };
export type RobotState = 'idle' | 'charging' | 'carrying';
export type RobotProps = GridCell & { state: RobotState };
export type RollerPlatformProps = GridCell & { kind: 'receiving' | 'shipping' };

export type GridSize = { columns: number; rows: number };

export type ElementKind = 'rack' | 'robot' | 'charger' | 'receiving' | 'shipping';
export type PaletteElement = { id: ElementKind; label: string };
export type SceneElementProps =
  | (RobotProps & { kind: 'robot' })
  | (GridCell & { kind: Exclude<ElementKind, 'robot'>; state?: never });
export type ActiveDrag = { pointerId: number; kind: ElementKind; source: Element };
export type PlacedElement = SceneElementProps & { id: string };
export type HitTest = (clientX: number, clientY: number) => GridCell | null;
export type SceneProps = GridSize & {
  hitTestRef: RefObject<HitTest | null>;
  objects: PlacedElement[];
  preview: SceneElementProps | null;
};
export type PaletteDragHandlers = {
  start: (event: PointerEvent, kind: ElementKind) => void;
  move: (event: PointerEvent) => void;
  drop: (event: PointerEvent) => void;
  cancel: (event: PointerEvent) => void;
};

export type GridTile = { row: number; column: number; texture: Texture };

export type WarehouseEditorProps = Partial<GridSize>;
