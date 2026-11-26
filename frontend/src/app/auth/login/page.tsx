import { LoginPage } from '@/_pages/auth';

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email, from } = await searchParams;

  return (
    <LoginPage
      defaultEmail={typeof email === 'string' ? email : undefined}
      from={typeof from === 'string' ? from : undefined}
    />
  );
}
