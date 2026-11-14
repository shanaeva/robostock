import { useRef, useState, type MouseEvent } from 'react';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  Info,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import {
  getWarehouseErrorMessage,
  useWarehouses,
  type Warehouse,
  type WarehouseMockApi,
} from '@/entities/warehouse';
import { WarehouseActionDialog, type WarehouseAction } from '@/features/manage-warehouse';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { WarehouseList } from './warehouse-list';

type RoleFilter = 'all' | Warehouse['currentUserRole'];
const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'Owner', label: 'Владелец' },
  { value: 'Observer', label: 'Наблюдатель' },
];

export function WarehousesContent({ api }: { api: WarehouseMockApi }) {
  const query = useWarehouses(api);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [action, setAction] = useState<WarehouseAction | null>(null);
  const [notice, setNotice] = useState('');
  const actionTrigger = useRef<HTMLButtonElement | null>(null);
  const createButton = useRef<HTMLButtonElement | null>(null);
  const warehouses = query.data ?? [];
  const visibleWarehouses = warehouses.filter((warehouse) => (
    warehouse.name.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')) &&
    (role === 'all' || warehouse.currentUserRole === role)
  ));

  function openAction(nextAction: WarehouseAction, event: MouseEvent<HTMLButtonElement>) {
    actionTrigger.current = event.currentTarget;
    setNotice('');
    setAction(nextAction);
  }

  function resetFilters() {
    setSearch('');
    setRole('all');
  }

  return (
    <div lang="ru" className="min-h-screen flex-1 bg-slate-50 font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Box className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">RoboStock</span>
          <span className="ml-4 hidden border-l border-slate-200 pl-5 text-sm text-slate-500 sm:inline">
            Управление складами
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Мои склады</h1>
            <p className="mt-2 text-sm text-slate-500">Управляйте складами и доступом к ним</p>
          </div>
          <Button
            ref={createButton}
            className="w-full sm:w-auto"
            onClick={(event) => openAction({ type: 'create' }, event)}
          >
            <Plus aria-hidden="true" /> Создать склад
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Демо-данные: изменения сбросятся после перезагрузки
        </p>

        {notice && (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">{notice}</p>
            <Button
              variant="ghost"
              size="icon"
              className="-my-1 size-7"
              aria-label="Скрыть уведомление"
              onClick={() => setNotice('')}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}

        <section aria-label="Список складов" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-sm">
              <label htmlFor="warehouse-search" className="sr-only">Поиск по названию склада</label>
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
              <Input
                id="warehouse-search"
                type="search"
                placeholder="Поиск по названию"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div role="group" aria-label="Фильтр по роли" className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {roleFilters.map((filter) => (
                <Button
                  key={filter.value}
                  size="sm"
                  variant="ghost"
                  aria-pressed={role === filter.value}
                  className={`h-8 flex-1 px-2 text-xs sm:px-3 sm:text-sm ${role === filter.value ? 'bg-white text-blue-700 shadow-sm hover:bg-white hover:text-blue-700' : ''}`}
                  onClick={() => setRole(filter.value)}
                >{filter.label}</Button>
              ))}
            </div>
          </div>

          {query.isPending ? (
            <div role="status" className="flex min-h-64 items-center justify-center gap-3 border-t border-slate-200 text-sm text-slate-500">
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Загружаем склады…
            </div>
          ) : query.isError ? (
            <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-4 border-t border-slate-200 p-6 text-center">
              <AlertCircle className="size-7 text-red-600" aria-hidden="true" />
              <p className="text-sm text-slate-600">{getWarehouseErrorMessage(query.error)}</p>
              <Button variant="outline" onClick={() => { void query.refetch(); }}>
                <RotateCcw aria-hidden="true" /> Повторить
              </Button>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 border-t border-slate-200 p-6 text-center">
              <WarehouseIcon className="mb-1 size-8 text-slate-400" aria-hidden="true" />
              <h2 className="font-semibold">У вас пока нет складов</h2>
              <p className="max-w-xs text-sm leading-6 text-slate-500">Создайте первый склад — вы станете его владельцем.</p>
            </div>
          ) : visibleWarehouses.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 border-t border-slate-200 p-6 text-center">
              <Search className="mb-1 size-7 text-slate-400" aria-hidden="true" />
              <h2 className="font-semibold">Ничего не найдено</h2>
              <p className="text-sm text-slate-500">Измените название или выбранную роль.</p>
              <Button variant="outline" onClick={resetFilters}>Сбросить фильтры</Button>
            </div>
          ) : <WarehouseList warehouses={visibleWarehouses} onAction={openAction} />}

          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 sm:px-6">
            <p id="warehouse-screen-note" className="text-xs leading-5 text-slate-500">
              Экран склада ещё в разработке. Открытие станет доступно позже.
            </p>
          </div>
        </section>
      </main>

      {action && (
        <WarehouseActionDialog
          key={action.type === 'create' ? 'create' : `${action.type}-${action.warehouse.id}`}
          action={action}
          api={api}
          onClose={() => setAction(null)}
          onSuccess={setNotice}
          onRestoreFocus={() => {
            const target = actionTrigger.current?.isConnected ? actionTrigger.current : createButton.current;
            target?.focus();
          }}
        />
      )}
    </div>
  );
}
