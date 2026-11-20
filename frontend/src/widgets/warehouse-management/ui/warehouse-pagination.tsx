import type { WarehouseListResult } from '@/entities/warehouse';
import { Button } from '@/shared/ui/button';

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
