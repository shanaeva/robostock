import { warehouseRoleLabels, type Warehouse } from '@/entities/warehouse';
import { cn } from '@/shared/lib/utils';

export function WarehouseRoleBadge({
  role,
}: {
  role: Warehouse['currentUserRole'];
}) {
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
