import { useCallback, useMemo, useState } from 'react';
import { ROTATE_ICON_PATH } from './constants';
import {
  applyLayoutChange,
  planObjectRemoval,
  planObjectRotation,
  planPlacement,
  type LayoutChange,
} from './layout';
import {
  cellKey,
  getSceneObjects,
  type SceneObjects,
  type WarehouseLayout,
} from './layoutModel';
import type {
  EditorTool,
  GridCell,
  GridSize,
  SceneDrop,
  ScenePreview,
} from './types';
import { useScenePointer, type ContextMenuTarget } from './useScenePointer';

const rotateCursorSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="${ROTATE_ICON_PATH}" stroke="white" stroke-width="4"/>` +
  `<path d="${ROTATE_ICON_PATH}" stroke="#075985" stroke-width="2"/>` +
  `</g></svg>`;
const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(rotateCursorSvg)}") 12 12, pointer`;

type PlanLayoutChange = (
  layout: WarehouseLayout,
  objects: SceneObjects,
) => LayoutChange | null;

export function useScenePlacement({ columns, rows }: GridSize) {
  const [layout, setLayout] = useState<WarehouseLayout>(() => new Map());
  const [tool, setTool] = useState<EditorTool>('move');
  const [rotationBlocked, setRotationBlocked] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(
    null,
  );
  const objects = useMemo(() => getSceneObjects(layout), [layout]);
  const deletion =
    contextMenu && planObjectRemoval(layout, objects, contextMenu.key);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  function commit(
    planChange: PlanLayoutChange,
    change = planChange(layout, objects),
  ) {
    setLayout((previous) =>
      applyLayoutChange(
        previous,
        previous === layout
          ? change
          : planChange(previous, getSceneObjects(previous)),
      ),
    );

    return change !== null;
  }

  function drop(drag: SceneDrop, cell: GridCell) {
    const grid = { columns, rows };
    const applied = commit((current, occupied) =>
      drag.rotateOnRelease
        ? planObjectRotation(current, occupied, grid, cellKey(cell))
        : planPlacement(current, occupied, grid, drag, cell),
    );

    if (drag.rotateOnRelease && !applied) {
      setRotationBlocked(true);
    }
  }

  const {
    dragTarget,
    hoveredKey,
    isMovingObject,
    hitTestRef,
    finish,
    pointerHandlers,
  } = useScenePointer({
    objects,
    tool,
    onGestureStart: () => setRotationBlocked(false),
    onDrop: drop,
    onContextMenu: setContextMenu,
    onDismissMenu: closeContextMenu,
  });
  const preview = useMemo<ScenePreview | null>(() => {
    if (!dragTarget) {
      return null;
    }

    const { drag, cell } = dragTarget;
    const plan = planPlacement(layout, objects, { columns, rows }, drag, cell);

    if (plan) {
      return {
        elements: plan.elements,
        hiddenKeys: plan.hiddenKeys,
        blocked: false,
        stationPreviews: plan.stationPreviews,
      };
    }

    return {
      elements: [{ ...drag.element, column: cell.column, row: cell.row }],
      hiddenKeys: [],
      blocked: true,
    };
  }, [layout, objects, columns, rows, dragTarget]);

  const handlers = {
    ...pointerHandlers,
    closeContextMenu,
    deleteObject() {
      if (!contextMenu || !deletion) {
        return;
      }

      commit(
        (current, occupied) =>
          planObjectRemoval(current, occupied, contextMenu.key),
        deletion,
      );
      closeContextMenu();
    },
    selectTool(next: EditorTool) {
      if (next !== tool) {
        finish();
        setRotationBlocked(false);
        setTool(next);
      }
    },
  };

  const hovered = hoveredKey !== null ? objects.get(hoveredKey) : undefined;
  const objectCursor = tool === 'rotate' ? ROTATE_CURSOR : 'grab';
  const hoverCursor = hovered ? objectCursor : undefined;
  const gridCursor = isMovingObject ? 'grabbing' : hoverCursor;

  return {
    objects,
    preview,
    hitTestRef,
    handlers,
    gridCursor,
    rotationBlocked,
    tool,
    contextMenu:
      contextMenu && objects.has(contextMenu.key) ? contextMenu : null,
    canDelete: deletion !== null,
  };
}
