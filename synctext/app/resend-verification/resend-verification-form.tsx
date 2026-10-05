import EmailAuthForm from "@/app/components/auth/EmailAuthForm";

export default function ResendVerificationForm() {
  return (
    <EmailAuthForm
      endpoint="/api/auth/resend-verification"
      title="Resend verification email"
      submitLabel="Send verification email"
      successPath="/auth?verify=resend-sent"
    />
  );
}
