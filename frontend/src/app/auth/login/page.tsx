'use client';

import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  const email = useSearchParams().get('email') ?? undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <LoginForm defaultEmail={email} />
    </main>
  );
}
