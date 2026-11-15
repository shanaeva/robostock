import type { MouseEvent } from 'react';
import {
  ArrowUpRight,
  Pencil,
  Trash2,
  UserPlus,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { warehouseRoleLabels, type Warehouse } from '../model/types';
import type { WarehouseAction } from '../model/use-warehouse-command';
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
  onAction,
}: {
  warehouse: Warehouse;
  allowInvitations: boolean;
  onAction: OpenAction;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 lg:justify-end">
      <Button
        variant="outline"
        size="sm"
        disabled
        aria-describedby="warehouse-screen-note"
        title="Экран склада ещё в разработке"
      >
        Открыть <ArrowUpRight aria-hidden="true" />
      </Button>
      {warehouse.currentUserRole === 'Owner' && (
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
          {allowInvitations && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Пригласить пользователя в склад «${warehouse.name}»`}
              title="Пригласить пользователя"
              onClick={(event) =>
                onAction({ type: 'invite', warehouse }, event)
              }
            >
              <UserPlus aria-hidden="true" />
            </Button>
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
  onAction,
}: {
  warehouses: Warehouse[];
  allowInvitations: boolean;
  onAction: OpenAction;
}) {
  return (
    <>
      <table className="hidden w-full table-fixed border-collapse text-left text-sm lg:table">
        <caption className="sr-only">Доступные склады и действия</caption>
        <thead className="border-y border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              Название склада
            </th>
            <th scope="col" className="w-36 px-4 py-3 font-medium">
              Размер
            </th>
            <th scope="col" className="w-40 px-4 py-3 font-medium">
              Ваша роль
            </th>
            <th scope="col" className="w-72 px-6 py-3 text-right font-medium">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {warehouses.map((warehouse) => (
            <tr key={warehouse.id} className="hover:bg-slate-50/70">
              <th scope="row" className="px-6 py-5 font-medium text-slate-900">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                    <WarehouseIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {warehouse.name}
                  </span>
                </div>
              </th>
              <td className="px-4 py-5 text-sm tabular-nums text-slate-600 [overflow-wrap:anywhere]">
                {warehouse.width} × {warehouse.height} клеток
              </td>
              <td className="px-4 py-5">
                <RoleBadge role={warehouse.currentUserRole} />
              </td>
              <td className="px-6 py-5">
                <WarehouseActions
                  warehouse={warehouse}
                  allowInvitations={allowInvitations}
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
              onAction={onAction}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
