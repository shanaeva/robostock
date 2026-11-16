import { RegisterForm } from '@/features/auth';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email: emailParam, name: nameParam } = await searchParams;
  const email = typeof emailParam === 'string' ? emailParam : undefined;
  const name = typeof nameParam === 'string' ? nameParam : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <RegisterForm defaultEmail={email} defaultName={name} />
    </main>
  );
}
