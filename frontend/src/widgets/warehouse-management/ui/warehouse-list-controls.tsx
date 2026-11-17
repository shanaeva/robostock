import { Search } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type {
  WarehouseListParams,
  WarehouseListResult,
} from '@/entities/warehouse';

const roleFilters = [
  { value: 'all', label: 'Все' },
  { value: 'Owner', label: 'Владелец' },
  { value: 'Observer', label: 'Наблюдатель' },
] as const;

const selectClassName =
  'h-9 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600';

export function WarehouseListControls({
  params,
  showRoles,
  onChange,
}: {
  params: WarehouseListParams;
  showRoles: boolean;
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
        {showRoles && (
          <div
            role="group"
            aria-label="Фильтр по роли"
            className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          >
            {roleFilters.map((filter) => (
              <Button
                key={filter.value}
                size="sm"
                variant="ghost"
                aria-pressed={(params.role ?? 'all') === filter.value}
                className={`h-8 flex-1 px-2 text-xs sm:px-3 sm:text-sm ${(params.role ?? 'all') === filter.value ? 'bg-white text-blue-700 shadow-sm hover:bg-white hover:text-blue-700' : ''}`}
                onClick={() =>
                  onChange({
                    role: filter.value === 'all' ? undefined : filter.value,
                  })
                }
              >
                {filter.label}
              </Button>
            ))}
          </div>
        )}
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

export function WarehousePagination({
  result,
  isFetching,
  onPageChange,
}: {
  result?: WarehouseListResult;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!result) {
    return null;
  }
  const pages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:px-6">
      <span aria-live="polite">
        Всего: {result.total}. Страница {result.page} из {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching || result.page <= 1}
          onClick={() => onPageChange(result.page - 1)}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching || result.page >= pages}
          onClick={() => onPageChange(result.page + 1)}
        >
          Далее
        </Button>
      </div>
    </div>
  );
}
