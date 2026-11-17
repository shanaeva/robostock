import { redirect } from 'next/navigation';
import { ResetPasswordPage } from '@/_pages/auth';

export default async function ResetPasswordRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email } = await searchParams;

  if (typeof email !== 'string' || !email) {
    redirect('/auth/forgot-password');
  }

  return <ResetPasswordPage email={email} />;
}
