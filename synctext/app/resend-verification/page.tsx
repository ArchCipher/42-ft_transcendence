import type { Metadata } from "next";
import "../auth/auth.css";
import ResendVerificationForm from "./resend-verification-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export const metadata: Metadata = { title: "Resend verification" };

export default function ResendVerification() {
  return (
    <AuthPageShell>
      <ResendVerificationForm />
    </AuthPageShell>
  );
}
