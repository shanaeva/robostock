import { ResetPasswordForm } from '@/features/auth';

export function ResetPasswordPage({ email }: { email: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <ResetPasswordForm email={email} />
    </main>
  );
}
