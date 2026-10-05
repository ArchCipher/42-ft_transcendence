import "../auth/auth.css";
import ResendVerificationForm from "./resend-verification-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export default function ResendVerification() {
  return (
    <AuthPageShell>
      <ResendVerificationForm />
    </AuthPageShell>
  );
}
