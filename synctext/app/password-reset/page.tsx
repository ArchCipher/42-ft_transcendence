import PasswordResetForm from "./password-reset-form";

export default async function PasswordReset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <PasswordResetForm token={token ?? ""} />;
}
