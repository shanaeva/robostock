import { ForgotPasswordForm } from '@/features/auth';

export function ForgotPasswordPage({ defaultEmail }: { defaultEmail?: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <ForgotPasswordForm defaultEmail={defaultEmail} />
    </main>
  );
}
