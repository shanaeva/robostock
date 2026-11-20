import { RegisterForm } from '@/features/auth';

export function RegisterPage({
  defaultEmail,
  defaultName,
}: {
  defaultEmail?: string;
  defaultName?: string;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <RegisterForm defaultEmail={defaultEmail} defaultName={defaultName} />
    </main>
  );
}
