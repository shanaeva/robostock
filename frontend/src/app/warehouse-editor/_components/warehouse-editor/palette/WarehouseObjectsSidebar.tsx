import dynamic from 'next/dynamic';
import { ROTATE_ICON_PATH } from '../constants';
import type { EditorTool, PaletteDragHandlers } from '../types';
import {
  PALETTE_ELEMENTS,
  PALETTE_ROW_HEIGHT,
  PREVIEW_WIDTH,
} from './constants';

const Icons = dynamic(() => import('./Icons').then((module) => module.Icons), {
  ssr: false,
});

const TOOLS = [
  {
    id: 'move',
    label: 'Перемещение',
    path: 'M12 3v18M3 12h18M9 6l3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',
  },
  {
    id: 'rotate',
    label: 'Разворот',
    path: ROTATE_ICON_PATH,
  },
] as const;

export function WarehouseObjectsSidebar({
  start,
  move,
  drop,
  cancel,
  rotationBlocked,
  tool,
  selectTool,
}: PaletteDragHandlers & {
  rotationBlocked: boolean;
  tool: EditorTool;
  selectTool: (tool: EditorTool) => void;
}) {
  return (
    <aside
      aria-label="Элементы сцены"
      className="w-36 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 px-2 py-4 text-zinc-900 sm:w-60 sm:px-4"
    >
      <div
        role="group"
        aria-label="Инструменты редактора"
        className="mb-4 flex gap-1"
      >
        {TOOLS.map(({ id, label, path }) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={tool === id}
            title={label}
            onClick={() => selectTool(id)}
            className="grid size-10 place-items-center rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 aria-pressed:border-sky-600 aria-pressed:bg-sky-100 aria-pressed:text-sky-900"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={path} />
            </svg>
          </button>
        ))}
      </div>
      <h2 className="mb-3 text-sm font-semibold">Элементы сцены</h2>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
        >
          <Icons />
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
      {tool === 'rotate' && (
        <p className="mt-4 text-xs text-zinc-600" role="status">
          {rotationBlocked
            ? 'Для поворота нужны свободные клетки в пределах сетки.'
            : 'Нажмите на объект, чтобы повернуть его на 90°.'}
        </p>
      )}
    </aside>
  );
}
