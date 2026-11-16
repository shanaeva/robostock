'use client';

import { useSearchParams } from 'next/navigation';
import { VerifyEmailForm } from '@/features/auth';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const name = params.get('name') ?? '';

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <VerifyEmailForm email={email} name={name} />
    </main>
  );
}
