import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getWarehouseErrorMessage } from '@/entities/warehouse';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DialogFooter } from '@/shared/ui/dialog';
import { warehouseNameSchema, type WarehouseNameValues } from '../model/schemas';

type Props = {
  initialName: string;
  isCreate: boolean;
  onSubmit: (values: WarehouseNameValues) => Promise<void>;
  onCancel: () => void;
};

export function WarehouseNameForm({ initialName, isCreate, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseNameValues>({
    resolver: zodResolver(warehouseNameSchema),
    defaultValues: { name: initialName },
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
        <label htmlFor="warehouse-name" className="text-sm font-medium">Название склада</label>
        <Input
          id="warehouse-name"
          autoComplete="off"
          placeholder="Например, Основной склад"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'warehouse-name-error' : undefined}
          readOnly={isSubmitting}
          {...register('name')}
        />
        {errors.name && <p id="warehouse-name-error" role="alert" className="text-sm text-red-700">{errors.name.message}</p>}
      </div>
      {errors.root && (
        <p role="alert" className="text-sm text-red-700">{errors.root.message}</p>
      )}
      <DialogFooter>
        <Button variant="outline" disabled={isSubmitting} onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем…' : isCreate ? 'Создать склад' : 'Сохранить'}
        </Button>
      </DialogFooter>
    </form>
  );
}
