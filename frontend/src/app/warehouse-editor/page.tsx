import type { Metadata } from 'next';
import { WarehouseEditor } from './_components/warehouse-editor/WarehouseEditor';

export const metadata: Metadata = {
  title: 'Редактор склада | RoboStock',
};

export default function WarehouseEditorPage() {
  return (
    <main lang="ru" className="flex h-dvh flex-col">
      <h1 className="border-b border-zinc-200 px-6 py-4 text-xl font-semibold">
        Редактор склада
      </h1>
      <WarehouseEditor columns={10} rows={10} />
    </main>
  );
}
