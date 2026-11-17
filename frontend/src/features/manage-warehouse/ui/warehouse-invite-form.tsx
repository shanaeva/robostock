import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getWarehouseErrorMessage } from '@/entities/warehouse';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DialogFooter } from '@/shared/ui/dialog';
import {
  warehouseInviteSchema,
  type WarehouseInviteValues,
} from '../model/schemas';

type Props = {
  onSubmit: (values: WarehouseInviteValues) => Promise<void>;
  onCancel: () => void;
};

export function WarehouseInviteForm({ onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseInviteValues>({
    resolver: zodResolver(warehouseInviteSchema),
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      setError('root', { message: getWarehouseErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="warehouse-email" className="text-sm font-medium">
          Email пользователя
        </label>
        <Input
          id="warehouse-email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'warehouse-email-error' : undefined}
          readOnly={isSubmitting}
          {...register('email')}
        />
        {errors.email && (
          <p
            id="warehouse-email-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        Роль: <span className="font-medium">Наблюдатель</span>
      </div>
      <p className="text-sm leading-6 text-slate-500">
        Демо-сценарий: письмо не будет отправлено, доступ пользователя не
        изменится.
      </p>
      {errors.root && (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" disabled={isSubmitting} onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Подготавливаем…' : 'Подготовить приглашение'}
        </Button>
      </DialogFooter>
    </form>
  );
}
