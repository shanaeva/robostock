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
  defaultWarehouseListParams,
  useWarehouses,
  type WarehouseDataSource,
  type WarehouseListParams,
} from '@/entities/warehouse';
import { isWarehouseDemoOwner } from '../model/demo-owner';
import {
  WarehouseActionDialog,
  type WarehouseAction,
} from '@/features/manage-warehouse';
import { Button } from '@/shared/ui/button';
import { WarehouseList } from './warehouse-list';
import {
  WarehouseListControls,
  WarehousePagination,
} from './warehouse-list-controls';

export function WarehousesContent({ api }: { api: WarehouseDataSource }) {
  const [params, setParams] = useState<WarehouseListParams>({
    ...defaultWarehouseListParams,
  });
  const query = useWarehouses(api, params);
  const [action, setAction] = useState<WarehouseAction | null>(null);
  const [notice, setNotice] = useState('');
  const [announceOnly, setAnnounceOnly] = useState(false);
  const actionTrigger = useRef<HTMLButtonElement | null>(null);
  const createButton = useRef<HTMLButtonElement | null>(null);
  const warehouses = query.data?.list ?? [];
  const hasFilters = Boolean(params.search.trim() || params.role);
  const demoOwner = isWarehouseDemoOwner(api.mode);

  function openAction(
    nextAction: WarehouseAction,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    actionTrigger.current = event.currentTarget;
    setNotice('');
    setAction(nextAction);
  }

  function resetFilters() {
    setParams((previous) => ({
      ...previous,
      search: '',
      role: undefined,
      page: 1,
    }));
  }

  function onMutationSuccess(message: string) {
    setNotice(message);
    setAnnounceOnly(action?.type === 'create' || action?.type === 'rename');
    setParams((previous) => ({ ...previous, page: 1 }));
  }

  return (
    <div
      lang="ru"
      className="min-h-screen flex-1 bg-slate-50 font-sans text-slate-900"
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Box className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            RoboStock
          </span>
          <span className="ml-4 hidden border-l border-slate-200 pl-5 text-sm text-slate-500 sm:inline">
            Управление складами
          </span>
          {demoOwner && (
            <span
              tabIndex={0}
              aria-describedby="warehouse-test-mode-note"
              className="group relative ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Тестовый режим
              <span
                id="warehouse-test-mode-note"
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-52 rounded-md bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-lg group-hover:block group-focus:block"
              >
                Реальные права пока не подключены
              </span>
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Мои склады
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Управляйте складами и доступом к ним
            </p>
          </div>
          <Button
            ref={createButton}
            className="w-full sm:w-auto"
            onClick={(event) => openAction({ type: 'create' }, event)}
          >
            <Plus aria-hidden="true" /> Создать склад
          </Button>
        </div>

        {!demoOwner && (
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {api.mode === 'mock'
              ? 'Демо-данные: изменения сбросятся после перезагрузки'
              : 'Сведения о правах пока недоступны. Изменение, удаление и приглашения отключены.'}
          </p>
        )}
        {demoOwner && (
          <span id="warehouse-invitations-note" className="sr-only">
            Скоро
          </span>
        )}

        <p role="status" aria-atomic="true" className="sr-only">
          {announceOnly ? notice : ''}
        </p>
        {notice && !announceOnly && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
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

        <section
          aria-label="Список складов"
          aria-busy={query.isFetching}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <WarehouseListControls
            params={params}
            showRoles={api.mode === 'mock'}
            onChange={(patch) =>
              setParams((previous) => ({ ...previous, ...patch, page: 1 }))
            }
          />

          {query.isPending ? (
            <div
              role="status"
              className="flex min-h-64 items-center justify-center gap-3 border-t border-slate-200 text-sm text-slate-500"
            >
              <LoaderCircle
                className="size-5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />{' '}
              Загружаем склады…
            </div>
          ) : query.isError ? (
            <div
              role="alert"
              className="flex min-h-64 flex-col items-center justify-center gap-4 border-t border-slate-200 p-6 text-center"
            >
              <AlertCircle className="size-7 text-red-600" aria-hidden="true" />
              <p className="text-sm text-slate-600">
                {getWarehouseErrorMessage(query.error)}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  void query.refetch();
                }}
              >
                <RotateCcw aria-hidden="true" /> Повторить
              </Button>
            </div>
          ) : query.data.total === 0 && !hasFilters ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 border-t border-slate-200 p-6 text-center">
              <WarehouseIcon
                className="mb-1 size-8 text-slate-400"
                aria-hidden="true"
              />
              <h2 className="font-semibold">У вас пока нет складов</h2>
              <p className="max-w-xs text-sm leading-6 text-slate-500">
                Создайте первый склад.
              </p>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 border-t border-slate-200 p-6 text-center">
              <Search
                className="mb-1 size-7 text-slate-400"
                aria-hidden="true"
              />
              <h2 className="font-semibold">Ничего не найдено</h2>
              <p className="text-sm text-slate-500">
                Измените условия поиска или вернитесь на первую страницу.
              </p>
              <Button variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <WarehouseList
              warehouses={warehouses}
              allowInvitations={Boolean(api.invite)}
              demoOwner={demoOwner}
              onAction={openAction}
            />
          )}

          <WarehousePagination
            result={query.isError ? undefined : query.data}
            isFetching={query.isFetching}
            onPageChange={(page) =>
              setParams((previous) => ({ ...previous, page }))
            }
          />

          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 sm:px-6">
            <p
              id="warehouse-screen-note"
              className="text-xs leading-5 text-slate-500"
            >
              Экран склада ещё в разработке. Открытие станет доступно позже.
            </p>
          </div>
        </section>
      </main>

      {action && (
        <WarehouseActionDialog
          key={
            action.type === 'create'
              ? 'create'
              : `${action.type}-${action.warehouse.id}`
          }
          action={action}
          api={api}
          onClose={() => setAction(null)}
          onSuccess={onMutationSuccess}
          onRestoreFocus={() => {
            const target = actionTrigger.current?.isConnected
              ? actionTrigger.current
              : createButton.current;
            target?.focus();
          }}
        />
      )}
    </div>
  );
}
