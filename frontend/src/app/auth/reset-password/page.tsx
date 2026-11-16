import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '@/features/auth';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email: emailParam } = await searchParams;
  const email = typeof emailParam === 'string' ? emailParam : null;

  if (!email) {
    redirect('/auth/forgot-password');
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <ResetPasswordForm email={email} />
    </main>
  );
}
