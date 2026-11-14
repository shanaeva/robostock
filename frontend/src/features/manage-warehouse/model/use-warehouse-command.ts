import { useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesQueryKey, type Warehouse, type WarehouseMockApi } from '@/entities/warehouse';

export type WarehouseCommand =
  | { type: 'create'; name: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'invite'; id: string; email: string };

export type WarehouseAction =
  | { type: 'create' }
  | { type: 'rename' | 'delete' | 'invite'; warehouse: Warehouse };

export function useWarehouseCommand(api: WarehouseMockApi) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (command: WarehouseCommand) => {
      switch (command.type) {
        case 'create':
          return { type: 'create' as const, warehouse: await api.create(command.name) };
        case 'rename':
          return { type: 'rename' as const, warehouse: await api.rename(command.id, command.name) };
        case 'delete':
          await api.remove(command.id);
          return { type: 'delete' as const, id: command.id };
        case 'invite':
          return { type: 'invite' as const, invitation: await api.invite(command.id, command.email) };
      }
    },
    onSuccess: async (result) => {
      // Update only after a successful response; failed mutations keep the list intact.
      if (result.type === 'invite') return;
      queryClient.setQueryData<Warehouse[]>(warehousesQueryKey, (previous = []) => {
        if (result.type === 'create') return [...previous, result.warehouse];
        if (result.type === 'delete') return previous.filter((warehouse) => warehouse.id !== result.id);
        return previous.map((warehouse) => warehouse.id === result.warehouse.id ? result.warehouse : warehouse);
      });
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
    },
  });
}
