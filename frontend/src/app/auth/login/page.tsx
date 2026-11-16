import { LoginForm } from '@/features/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email: emailParam } = await searchParams;
  const email = typeof emailParam === 'string' ? emailParam : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <LoginForm defaultEmail={email} />
    </main>
  );
}
