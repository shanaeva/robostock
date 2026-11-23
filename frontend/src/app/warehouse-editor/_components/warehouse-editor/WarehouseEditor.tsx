'use client';

import dynamic from 'next/dynamic';
import type { WarehouseEditorProps } from './types';
import { resolveDimension } from './utils';
import { WarehouseObjectsSidebar } from './palette/WarehouseObjectsSidebar';
import { useScenePlacement } from './useScenePlacement';
import { ObjectContextMenu } from './ObjectContextMenu';

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
  const {
    handlers,
    objects,
    preview,
    hitTestRef,
    gridCursor,
    rotationBlocked,
    tool,
    contextMenu,
    canDelete,
  } = useScenePlacement({ columns, rows });

  return (
    <div className="flex min-h-0 flex-1">
      <WarehouseObjectsSidebar
        start={handlers.startFromPalette}
        move={handlers.move}
        drop={handlers.drop}
        cancel={handlers.cancel}
        rotationBlocked={rotationBlocked}
        tool={tool}
        selectTool={handlers.selectTool}
      />
      <div
        role="region"
        aria-label={`Холст редактора склада, ${columns} × ${rows}`}
        className="relative min-w-0 flex-1 touch-none overflow-hidden bg-white"
        style={{ cursor: gridCursor }}
        onPointerDown={handlers.startFromGrid}
        onPointerEnter={handlers.moveOverGrid}
        onPointerMove={handlers.moveOverGrid}
        onPointerLeave={handlers.leaveGrid}
        onPointerUp={handlers.drop}
        onPointerCancel={handlers.cancel}
        onLostPointerCapture={handlers.cancel}
        onContextMenu={handlers.openContextMenu}
      >
        <GridCanvas
          columns={columns}
          rows={rows}
          objects={objects}
          preview={preview}
          hitTestRef={hitTestRef}
        />
        {contextMenu && (
          <ObjectContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            canDelete={canDelete}
            onDelete={handlers.deleteObject}
            onClose={handlers.closeContextMenu}
          />
        )}
      </div>
    </div>
  );
}
