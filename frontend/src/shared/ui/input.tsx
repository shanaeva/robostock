// Adapted from shadcn/ui (MIT).
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50 aria-invalid:border-red-500 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}
