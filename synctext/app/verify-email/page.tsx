import type { Metadata } from "next";
import VerifyEmailForm from "./verify-email-form";
import "../auth/auth.css";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthPageShell>
      <VerifyEmailForm token={token ?? ""} />
    </AuthPageShell>
  );
}
