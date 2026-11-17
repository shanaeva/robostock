import { LoginPage } from '@/_pages/auth';

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email } = await searchParams;

  return <LoginPage defaultEmail={typeof email === 'string' ? email : undefined} />;
}
