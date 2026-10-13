import type { Metadata } from "next";
import "../auth/auth.css";
import { Suspense } from "react";
import PasswordResetForm from "./password-reset-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export const metadata: Metadata = { title: "Reset password" };

export default function PasswordReset() {
  return (
    <AuthPageShell >
      <Suspense fallback={null}>
        <PasswordResetForm />
      </Suspense>
    </AuthPageShell>
  );
}
