import { VerifyEmailForm } from '@/features/auth';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email: emailParam, name: nameParam } = await searchParams;
  const email = typeof emailParam === 'string' ? emailParam : '';
  const name = typeof nameParam === 'string' ? nameParam : '';

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <VerifyEmailForm email={email} name={name} />
    </main>
  );
}
