import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cellKey, type SceneObjects } from './layoutModel';
import type {
  ActiveDrag,
  EditorTool,
  ElementKind,
  GridCell,
  HitTest,
  PlacementDrag,
  SceneDrop,
  SceneElementProps,
} from './types';
import { createSceneElement, sameCell } from './utils';

const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 8;

export type ContextMenuTarget = { key: string; x: number; y: number };

type ScenePointerOptions = {
  objects: SceneObjects;
  tool: EditorTool;
  onGestureStart: () => void;
  onDrop: (drag: SceneDrop, cell: GridCell) => void;
  onContextMenu: (target: ContextMenuTarget | null) => void;
  onDismissMenu: () => void;
};

export function useScenePointer({
  objects,
  tool,
  onGestureStart,
  onDrop,
  onContextMenu,
  onDismissMenu,
}: ScenePointerOptions) {
  const [dragTarget, setDragTarget] = useState<{
    drag: PlacementDrag;
    cell: GridCell;
  } | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [isMovingObject, setIsMovingObject] = useState(false);
  const hitTestRef = useRef<HitTest | null>(null);
  const active = useRef<ActiveDrag | null>(null);
  const longPress = useRef<{ timer: number; x: number; y: number } | null>(
    null,
  );

  const clearLongPress = useCallback(() => {
    if (longPress.current) {
      window.clearTimeout(longPress.current.timer);
      longPress.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearLongPress();
    const drag = active.current;
    active.current = null;

    if (drag?.source.hasPointerCapture(drag.pointerId)) {
      drag.source.releasePointerCapture(drag.pointerId);
    }
    setDragTarget(null);
    setIsMovingObject(false);
  }, [clearLongPress]);

  useEffect(() => {
    function dismiss() {
      finish();
      onDismissMenu();
    }

    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dismiss();
      }
    }
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', dismiss);

    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', dismiss);
      clearLongPress();
    };
  }, [clearLongPress, finish, onDismissMenu]);

  function canStart(event: PointerEvent) {
    return active.current === null && event.isPrimary && event.button === 0;
  }

  function start(
    event: PointerEvent,
    element: SceneElementProps,
    originKey: string | null,
    rotateOnRelease = false,
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = {
      element,
      originKey,
      pointerId: event.pointerId,
      source: event.currentTarget,
      rotateOnRelease,
    };
    onGestureStart();
    setIsMovingObject(originKey !== null && !rotateOnRelease);
  }

  function move(event: PointerEvent, trackHover = false) {
    const drag = active.current;
    const isDragging = drag?.pointerId === event.pointerId;
    const canHover = trackHover && event.pointerType !== 'touch';

    if (!isDragging && !canHover) {
      return;
    }

    const cell = hitTestRef.current?.(event.clientX, event.clientY);
    const key = cell ? cellKey(cell) : null;

    if (canHover) {
      setHoveredKey(key);
    }

    if (!isDragging) {
      return;
    }

    const press = longPress.current;

    if (
      press &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) >=
        LONG_PRESS_TOLERANCE
    ) {
      clearLongPress();
    }

    if (drag.rotateOnRelease || longPress.current) {
      return;
    }

    setDragTarget((previous) => {
      if (!cell || key === drag.originKey) {
        return null;
      }

      return previous && sameCell(previous.cell, cell)
        ? previous
        : {
            drag: { element: drag.element, originKey: drag.originKey },
            cell,
          };
    });
  }

  return {
    dragTarget,
    hoveredKey,
    isMovingObject,
    hitTestRef,
    finish,
    pointerHandlers: {
      startFromPalette(event: PointerEvent, kind: ElementKind) {
        if (canStart(event)) {
          start(event, createSceneElement(kind, { column: 0, row: 0 }), null);
        }
      },
      startFromGrid(event: PointerEvent) {
        if (!canStart(event)) {
          return;
        }

        const { clientX: x, clientY: y } = event;
        const cell = hitTestRef.current?.(x, y);
        const originKey = cell ? cellKey(cell) : null;
        const element = originKey ? objects.get(originKey) : undefined;

        if (!element || !originKey) {
          onGestureStart();

          return;
        }

        start(event, element, originKey, tool === 'rotate');

        if (event.pointerType === 'touch') {
          const timer = window.setTimeout(() => {
            finish();
            onContextMenu({ key: originKey, x, y });
          }, LONG_PRESS_MS);
          longPress.current = { timer, x, y };
        }
      },
      openContextMenu(event: MouseEvent) {
        if (event.defaultPrevented) {
          return;
        }

        event.preventDefault();
        finish();
        const { clientX: x, clientY: y } = event;
        const cell = hitTestRef.current?.(x, y);
        const key = cell ? cellKey(cell) : null;
        onContextMenu(key && objects.has(key) ? { key, x, y } : null);
      },
      move(event: PointerEvent) {
        move(event);
      },
      moveOverGrid(event: PointerEvent) {
        move(event, true);
      },
      leaveGrid() {
        setHoveredKey(null);
      },
      drop(event: PointerEvent) {
        const drag = active.current;

        if (drag?.pointerId !== event.pointerId) {
          return;
        }

        const cell = hitTestRef.current?.(event.clientX, event.clientY);

        if (
          cell &&
          (!drag.rotateOnRelease || cellKey(cell) === drag.originKey)
        ) {
          onDrop(drag, cell);
        }
        finish();
      },
      cancel(event: PointerEvent) {
        if (active.current?.pointerId === event.pointerId) {
          finish();
        }
      },
    },
  };
}
