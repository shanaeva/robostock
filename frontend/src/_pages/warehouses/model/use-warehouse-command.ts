import { useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesQueryKey } from '../api/queries';
import type { WarehouseDataSource } from '../api/types';
import { WarehouseApiError } from '../api/errors';
import type { Warehouse } from './types';
import type { WarehouseCreateValues } from './schemas';

export type WarehouseCommand =
  | ({ type: 'create' } & WarehouseCreateValues)
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete'; id: string }
  | { type: 'invite'; id: string; email: string };

export type WarehouseAction =
  | { type: 'create' }
  | { type: 'rename' | 'delete' | 'invite'; warehouse: Warehouse };

export function useWarehouseCommand(api: WarehouseDataSource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: WarehouseCommand) => {
      switch (command.type) {
        case 'create':
          return api.create({
            name: command.name,
            width: command.width,
            height: command.height,
          });
        case 'rename':
          return api.rename(command.id, { name: command.name });
        case 'delete':
          return api.remove(command.id);
        case 'invite':
          if (!api.invite) {
            throw new WarehouseApiError(
              null,
              'Приглашения доступны только в деморежиме.',
            );
          }

          return api.invite(command.id, command.email);
      }
    },
    onSuccess: async (_result, command) => {
      // Creation returns only an ID; rename/delete return no body (204 in the draft).
      // Refetch after success instead of treating any response as a Warehouse object.
      if (command.type === 'invite') {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
    },
  });
}
