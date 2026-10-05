import EmailAuthForm from "@/app/components/auth/EmailAuthForm";

export default function ForgotPasswordForm() {
  return (
    <EmailAuthForm
      endpoint="/api/auth/forgot-password"
      title="Reset your password"
      submitLabel="Send password reset email"
      successPath="/auth?verify=reset-sent"
    />
  );
}
