import PasswordResetForm from "./password-reset-form";

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <PasswordResetForm token={token ?? ""} />;
}
