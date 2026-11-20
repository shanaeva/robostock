import type { MouseEvent } from 'react';
import { ArrowUpRight, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { Warehouse } from '@/entities/warehouse';
import type { WarehouseAction } from '@/features/manage-warehouse';
import { Button } from '@/shared/ui/button';

export type OpenAction = (
  action: WarehouseAction,
  event: MouseEvent<HTMLButtonElement>,
) => void;

export function WarehouseActions({
  warehouse,
  allowInvitations,
  demoOwner,
  onAction,
}: {
  warehouse: Warehouse;
  allowInvitations: boolean;
  demoOwner: boolean;
  onAction: OpenAction;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 lg:flex-nowrap lg:justify-start">
      <Button
        variant="outline"
        size="sm"
        disabled
        aria-describedby="warehouse-screen-note"
        title="Экран склада ещё в разработке"
      >
        Открыть <ArrowUpRight aria-hidden="true" />
      </Button>
      {(warehouse.currentUserRole === 'Owner' || demoOwner) && (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Переименовать склад «${warehouse.name}»`}
            title="Переименовать"
            onClick={(event) => onAction({ type: 'rename', warehouse }, event)}
          >
            <Pencil aria-hidden="true" />
          </Button>
          {(allowInvitations || demoOwner) && (
            <span
              tabIndex={demoOwner ? 0 : undefined}
              aria-label={demoOwner ? 'Пригласить пользователя' : undefined}
              aria-describedby={
                demoOwner ? 'warehouse-invitations-note' : undefined
              }
              className="group relative inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Button
                variant="ghost"
                size="icon"
                disabled={demoOwner}
                aria-describedby={
                  demoOwner ? 'warehouse-invitations-note' : undefined
                }
                aria-label={`Пригласить пользователя в склад «${warehouse.name}»`}
                title="Пригласить пользователя"
                onClick={(event) =>
                  !demoOwner && onAction({ type: 'invite', warehouse }, event)
                }
              >
                <UserPlus aria-hidden="true" />
              </Button>
              {demoOwner && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus:block"
                >
                  Скоро
                </span>
              )}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label={`Удалить склад «${warehouse.name}»`}
            title="Удалить"
            onClick={(event) => onAction({ type: 'delete', warehouse }, event)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );
}
