import { ForgotPasswordPage } from '@/_pages/auth';

export default async function ForgotPasswordRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email } = await searchParams;

  return <ForgotPasswordPage defaultEmail={typeof email === 'string' ? email : undefined} />;
}
