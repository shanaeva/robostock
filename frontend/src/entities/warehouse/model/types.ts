// Модель отображения складов. Контракт API ещё не согласован.
export type Warehouse = {
  id: string;
  name: string;
  currentUserRole: 'Owner' | 'Observer';
};

export const warehouseRoleLabels: Record<Warehouse['currentUserRole'], string> = {
  Owner: 'Владелец',
  Observer: 'Наблюдатель',
};
