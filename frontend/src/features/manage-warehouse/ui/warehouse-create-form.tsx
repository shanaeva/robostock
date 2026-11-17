import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DialogFooter } from '@/shared/ui/dialog';
import {
  getWarehouseErrorMessage,
  warehouseCreateSchema,
  type WarehouseCreateInput,
} from '@/entities/warehouse';

type Props = {
  onSubmit: (values: WarehouseCreateInput) => Promise<void>;
  onCancel: () => void;
};

const dimensionFields = [
  { name: 'width', label: 'Ширина, клеток' },
  { name: 'height', label: 'Высота, клеток' },
] as const;

export function WarehouseCreateForm({ onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseCreateInput>({
    resolver: zodResolver(warehouseCreateSchema),
    defaultValues: { name: '', width: 20, height: 20 },
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
        <label htmlFor="warehouse-name" className="text-sm font-medium">
          Название склада
        </label>
        <Input
          id="warehouse-name"
          autoComplete="off"
          placeholder="Например, Основной склад"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'warehouse-name-error' : undefined}
          readOnly={isSubmitting}
          {...register('name')}
        />
        {errors.name && (
          <p
            id="warehouse-name-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {dimensionFields.map((field) => (
          <div key={field.name} className="min-w-0 space-y-2">
            <label
              htmlFor={`warehouse-${field.name}`}
              className="text-sm font-medium"
            >
              {field.label}
            </label>
            <Input
              id={`warehouse-${field.name}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              step={1}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={
                errors[field.name] ? `warehouse-${field.name}-error` : undefined
              }
              readOnly={isSubmitting}
              {...register(field.name, { valueAsNumber: true })}
            />
            {errors[field.name] && (
              <p
                id={`warehouse-${field.name}-error`}
                role="alert"
                className="text-sm text-red-700"
              >
                {errors[field.name]?.message}
              </p>
            )}
          </div>
        ))}
      </div>
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
          {isSubmitting ? 'Сохраняем…' : 'Создать склад'}
        </Button>
      </DialogFooter>
    </form>
  );
}
