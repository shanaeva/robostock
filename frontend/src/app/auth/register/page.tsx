'use client';

import { useSearchParams } from 'next/navigation';
import { RegisterForm } from '@/features/auth';

export default function RegisterPage() {
  const params = useSearchParams();
  const email = params.get('email') ?? undefined;
  const name = params.get('name') ?? undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <RegisterForm defaultEmail={email} defaultName={name} />
    </main>
  );
}
