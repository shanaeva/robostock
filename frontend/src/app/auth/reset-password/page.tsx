'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ResetPasswordForm } from '@/features/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const email = useSearchParams().get('email');

  useEffect(() => {
    if (!email) {
      router.replace('/auth/forgot-password');
    }
  }, [email, router]);

  if (!email) {
    return null;
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <ResetPasswordForm email={email} />
    </main>
  );
}
