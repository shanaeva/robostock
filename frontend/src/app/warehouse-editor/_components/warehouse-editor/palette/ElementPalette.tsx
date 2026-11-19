import dynamic from 'next/dynamic';
import type { PaletteDragHandlers } from '../types';
import {
  PALETTE_ELEMENTS,
  PALETTE_ROW_HEIGHT,
  PREVIEW_WIDTH,
} from './constants';

const PalettePreviews = dynamic(
  () => import('./PalettePreviews').then((module) => module.PalettePreviews),
  { ssr: false },
);

export function ElementPalette({
  start,
  move,
  drop,
  cancel,
}: PaletteDragHandlers) {
  return (
    <aside
      aria-label="Элементы сцены"
      className="w-36 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 px-2 py-4 text-zinc-900 sm:w-60 sm:px-4"
    >
      <h2 className="mb-3 text-sm font-semibold">Элементы сцены</h2>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
        >
          <PalettePreviews />
        </div>
        <ul>
          {PALETTE_ELEMENTS.map(({ id, label }) => (
            <li
              key={id}
              onPointerDown={(event) => start(event, id)}
              onPointerMove={move}
              onPointerUp={drop}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
              className="flex touch-none select-none cursor-grab items-center border-b border-zinc-200 text-xs hover:bg-zinc-100 active:cursor-grabbing sm:text-sm"
              style={{
                height: PALETTE_ROW_HEIGHT,
                paddingLeft: PREVIEW_WIDTH + 8,
              }}
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
