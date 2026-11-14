'use client';

import { type WarehouseMockApi, getWarehouseErrorMessage } from '@/entities/warehouse';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { useWarehouseCommand, type WarehouseAction } from '../model/use-warehouse-command';
import { WarehouseNameForm } from './warehouse-name-form';
import { WarehouseInviteForm } from './warehouse-invite-form';

type Props = {
  action: WarehouseAction;
  api: WarehouseMockApi;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRestoreFocus: () => void;
};

const titles = {
  create: 'Создать склад',
  rename: 'Переименовать склад',
  delete: 'Удалить склад?',
  invite: 'Пригласить пользователя',
};

export function WarehouseActionDialog({ action, api, onClose, onSuccess, onRestoreFocus }: Props) {
  const mutation = useWarehouseCommand(api);

  async function removeWarehouse() {
    if (action.type !== 'delete' || mutation.isPending) return;
    try {
      await mutation.mutateAsync({ type: 'delete', id: action.warehouse.id });
      onSuccess('Склад удалён.');
      onClose();
    } catch {
      // The mutation error is rendered below. Keep the confirmation open.
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}>
      <DialogContent
        closeDisabled={mutation.isPending}
        onEscapeKeyDown={(event) => { if (mutation.isPending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (mutation.isPending) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}
      >
        <DialogHeader>
          <DialogTitle>{titles[action.type]}</DialogTitle>
          <DialogDescription>
            {action.type === 'create' && 'Укажите название нового склада. Вы станете его владельцем.'}
            {action.type === 'rename' && 'Новое название будет отображаться в списке складов.'}
            {action.type === 'delete' && <>Склад «{action.warehouse.name}» будет удалён из списка. Это действие нельзя отменить.</>}
            {action.type === 'invite' && <>Приглашение в склад «{action.warehouse.name}» с ролью наблюдателя.</>}
          </DialogDescription>
        </DialogHeader>

        {(action.type === 'create' || action.type === 'rename') && (
          <WarehouseNameForm
            isCreate={action.type === 'create'}
            initialName={action.type === 'rename' ? action.warehouse.name : ''}
            onCancel={onClose}
            onSubmit={async ({ name }) => {
              await mutation.mutateAsync(action.type === 'create'
                ? { type: 'create', name }
                : { type: 'rename', id: action.warehouse.id, name });
              onSuccess(action.type === 'create' ? 'Склад создан. Вы — его владелец.' : 'Название склада обновлено.');
              onClose();
            }}
          />
        )}

        {action.type === 'invite' && (
          <WarehouseInviteForm
            onCancel={onClose}
            onSubmit={async ({ email }) => {
              await mutation.mutateAsync({ type: 'invite', id: action.warehouse.id, email });
              onSuccess(`Демо-приглашение для ${email} подготовлено. Письмо не отправлялось.`);
              onClose();
            }}
          />
        )}

        {action.type === 'delete' && (
          <>
            {mutation.isError && <p role="alert" className="text-sm text-red-700">{getWarehouseErrorMessage(mutation.error)}</p>}
            <DialogFooter>
              <Button autoFocus variant="outline" disabled={mutation.isPending} onClick={onClose}>Отмена</Button>
              <Button variant="destructive" disabled={mutation.isPending} onClick={removeWarehouse}>
                {mutation.isPending ? 'Удаляем…' : 'Удалить'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
