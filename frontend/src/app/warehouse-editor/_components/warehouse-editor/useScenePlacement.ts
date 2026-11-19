import { useEffect, useRef, useState } from 'react';
import type {
  ActiveDrag,
  HitTest,
  PaletteDragHandlers,
  PlacedElement,
  SceneElementProps,
} from './types';
import { createSceneElement, sameCell } from './utils';

export function useScenePlacement() {
  const [objects, setObjects] = useState<PlacedElement[]>([]);
  const [preview, setPreview] = useState<SceneElementProps | null>(null);
  const hitTestRef = useRef<HitTest | null>(null);
  const active = useRef<ActiveDrag | null>(null);
  const nextId = useRef(1);

  function finish() {
    const drag = active.current;
    active.current = null;

    if (drag?.source.hasPointerCapture(drag.pointerId)) {
      drag.source.releasePointerCapture(drag.pointerId);
    }
    setPreview(null);
  }

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        finish();
      }
    }
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', finish);

    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', finish);
    };
  }, []);

  const handlers: PaletteDragHandlers = {
    start(event, kind) {
      if (active.current || !event.isPrimary || event.button !== 0) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      active.current = {
        kind,
        pointerId: event.pointerId,
        source: event.currentTarget,
      };
    },
    move(event) {
      const drag = active.current;

      if (drag?.pointerId !== event.pointerId) {
        return;
      }
      const cell = hitTestRef.current?.(event.clientX, event.clientY);
      setPreview((previous) => {
        if (!cell) {
          return null;
        }

        return previous && sameCell(previous, cell)
          ? previous
          : createSceneElement(drag.kind, cell);
      });
    },
    drop(event) {
      const drag = active.current;

      if (drag?.pointerId !== event.pointerId) {
        return;
      }
      const cell = hitTestRef.current?.(event.clientX, event.clientY);

      if (cell) {
        const item = {
          ...createSceneElement(drag.kind, cell),
          id: String(nextId.current++),
        };
        setObjects((previous) =>
          previous.some((object) => sameCell(object, cell))
            ? previous
            : [...previous, item],
        );
      }
      finish();
    },
    cancel(event) {
      if (active.current?.pointerId === event.pointerId) {
        finish();
      }
    },
  };

  return { objects, preview, hitTestRef, handlers };
}
