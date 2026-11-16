'use client';

import { useSearchParams } from 'next/navigation';
import { ForgotPasswordForm } from '@/features/auth';

export default function ForgotPasswordPage() {
  const email = useSearchParams().get('email') ?? undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <ForgotPasswordForm defaultEmail={email} />
    </main>
  );
}
