import { RegisterPage } from '@/_pages/auth';

export default async function RegisterRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email, name } = await searchParams;

  return (
    <RegisterPage
      defaultEmail={typeof email === 'string' ? email : undefined}
      defaultName={typeof name === 'string' ? name : undefined}
    />
  );
}
