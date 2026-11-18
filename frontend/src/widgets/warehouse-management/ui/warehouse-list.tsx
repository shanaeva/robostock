import { Warehouse as WarehouseIcon } from 'lucide-react';
import type { Warehouse } from '@/entities/warehouse';
import { WarehouseRoleBadge } from './warehouse-role-badge';
import { WarehouseActions, type OpenAction } from './warehouse-actions';

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
                <WarehouseRoleBadge role={warehouse.currentUserRole} />
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
                <WarehouseRoleBadge role={warehouse.currentUserRole} />
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
