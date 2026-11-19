import { VerifyEmailForm } from '@/features/auth';

export function VerifyEmailPage({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <VerifyEmailForm email={email} name={name} />
    </main>
  );
}
