import type { Metadata } from "next";
import "../auth/auth.css";
import ForgotPasswordForm from "./forgot-password-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPassword() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
