import { VerifyEmailPage } from '@/_pages/auth';

export default async function VerifyEmailRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email, name } = await searchParams;

  return (
    <VerifyEmailPage
      email={typeof email === 'string' ? email : ''}
      name={typeof name === 'string' ? name : ''}
    />
  );
}
