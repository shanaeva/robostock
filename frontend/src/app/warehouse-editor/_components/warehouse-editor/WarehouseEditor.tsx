'use client';

import dynamic from 'next/dynamic';
import type { WarehouseEditorProps } from './types';
import { resolveDimension } from './utils';
import { ElementPalette } from './palette/ElementPalette';
import { useScenePlacement } from './useScenePlacement';

const GridCanvas = dynamic(
  () => import('./GridCanvas').then((module) => module.GridCanvas),
  { ssr: false },
);

export function WarehouseEditor({
  columns: requestedColumns,
  rows: requestedRows,
}: WarehouseEditorProps) {
  const columns = resolveDimension(requestedColumns);
  const rows = resolveDimension(requestedRows);
  const { handlers, ...scene } = useScenePlacement();

  return (
    <div className="flex min-h-0 flex-1">
      <ElementPalette {...handlers} />
      <div
        role="region"
        aria-label={`Холст редактора склада, ${columns} × ${rows}`}
        className="relative min-w-0 flex-1 overflow-hidden bg-white"
      >
        <GridCanvas columns={columns} rows={rows} {...scene} />
      </div>
    </div>
  );
}
