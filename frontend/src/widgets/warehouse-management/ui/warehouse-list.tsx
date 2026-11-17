import type { MouseEvent } from 'react';
import {
  ArrowUpRight,
  Pencil,
  Trash2,
  UserPlus,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { warehouseRoleLabels, type Warehouse } from '@/entities/warehouse';
import type { WarehouseAction } from '@/features/manage-warehouse';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

type OpenAction = (
  action: WarehouseAction,
  event: MouseEvent<HTMLButtonElement>,
) => void;

function RoleBadge({ role }: { role: Warehouse['currentUserRole'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2.5 py-1 text-xs font-medium',
        role === 'Owner'
          ? 'border-blue-100 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
      )}
    >
      {role ? warehouseRoleLabels[role] : 'Роль не указана'}
    </span>
  );
}

function WarehouseActions({
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

export function WarehouseList({
  warehouses,
  allowInvitations,
  demoOwner = false,
  onAction,
}: {
  warehouses: Warehouse[];
  allowInvitations: boolean;
  demoOwner?: boolean;
  onAction: OpenAction;
}) {
  return (
    <>
      <table className="hidden w-full table-fixed border-collapse text-left text-sm lg:table">
        <caption className="sr-only">Доступные склады и действия</caption>
        <thead className="border-y border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3">
                <span aria-hidden="true" />
                <span>Название склада</span>
              </div>
            </th>
            <th scope="col" className="w-36 px-4 py-3 font-medium">
              Размер
            </th>
            <th scope="col" className="w-40 px-4 py-3 font-medium">
              Ваша роль
            </th>
            <th scope="col" className="w-72 px-6 py-3 text-left font-medium">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {warehouses.map((warehouse) => (
            <tr key={warehouse.id} className="hover:bg-slate-50/70">
              <th
                scope="row"
                className="px-6 py-4 align-middle font-medium text-slate-900"
              >
                <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                    <WarehouseIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {warehouse.name}
                  </span>
                </div>
              </th>
              <td className="px-4 py-4 align-middle text-sm tabular-nums text-slate-600 [overflow-wrap:anywhere]">
                {warehouse.width} × {warehouse.height} клеток
              </td>
              <td className="px-4 py-4 align-middle">
                <RoleBadge role={warehouse.currentUserRole} />
              </td>
              <td className="px-6 py-4 align-middle">
                <WarehouseActions
                  warehouse={warehouse}
                  allowInvitations={allowInvitations}
                  demoOwner={demoOwner}
                  onAction={onAction}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul
        className="divide-y divide-slate-200 border-t border-slate-200 lg:hidden"
        aria-label="Доступные склады"
      >
        {warehouses.map((warehouse) => (
          <li key={warehouse.id} className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <WarehouseIcon
                className="mt-1 size-5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <div className="min-w-0 space-y-2">
                <h2 className="font-medium [overflow-wrap:anywhere]">
                  {warehouse.name}
                </h2>
                <p className="text-sm tabular-nums text-slate-500 [overflow-wrap:anywhere]">
                  {warehouse.width} × {warehouse.height} клеток
                </p>
                <RoleBadge role={warehouse.currentUserRole} />
              </div>
            </div>
            <WarehouseActions
              warehouse={warehouse}
              allowInvitations={allowInvitations}
              demoOwner={demoOwner}
              onAction={onAction}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
