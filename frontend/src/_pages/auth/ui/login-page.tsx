import { LoginForm } from '@/features/auth';

export function LoginPage({
  defaultEmail,
  from,
}: {
  defaultEmail?: string;
  from?: string;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <LoginForm defaultEmail={defaultEmail} from={from} />
    </main>
  );
}
