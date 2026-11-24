import { Search } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import type { WarehouseListParams } from '@/entities/warehouse';

const selectClassName =
  'h-9 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600';

export function WarehouseListControls({
  params,
  onChange,
}: {
  params: WarehouseListParams;
  onChange: (patch: Partial<WarehouseListParams>) => void;
}) {
  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <label htmlFor="warehouse-search" className="sr-only">
            Поиск по названию склада
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            id="warehouse-search"
            type="search"
            placeholder="Поиск по названию"
            className="pl-9"
            value={params.search}
            onChange={(event) => onChange({ search: event.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-500">
          Сортировать по
          <select
            aria-label="Поле сортировки"
            className={selectClassName}
            value={params.sortBy}
            onChange={(event) =>
              onChange({
                sortBy: event.target.value as WarehouseListParams['sortBy'],
              })
            }
          >
            <option value="name">Названию</option>
            <option value="width">Ширине</option>
            <option value="height">Высоте</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-500">
          Порядок
          <select
            aria-label="Направление сортировки"
            className={selectClassName}
            value={params.sortOrder}
            onChange={(event) =>
              onChange({
                sortOrder: event.target
                  .value as WarehouseListParams['sortOrder'],
              })
            }
          >
            <option value="asc">По возрастанию</option>
            <option value="desc">По убыванию</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-500">
          Строк на странице
          <select
            aria-label="Строк на странице"
            className={selectClassName}
            value={params.limit}
            onChange={(event) =>
              onChange({ limit: Number(event.target.value) })
            }
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );
}
