import { LoginForm } from '@/features/auth';

export function LoginPage({ defaultEmail }: { defaultEmail?: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <LoginForm defaultEmail={defaultEmail} />
    </main>
  );
}
