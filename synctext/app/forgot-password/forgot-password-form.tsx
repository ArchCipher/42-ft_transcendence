"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import { DisplayText, TechText } from "@/app/components/typography/Typography";
import ErrorNote from "../components/form/ErrorNote";
import { forgotPasswordSchema } from "@/lib/auth/validation";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // calls /api/auth/forgot-password
  async function handleForgotPassword() {
    setError("");
    setFieldErrors({});
    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;

      setFieldErrors({
        email: fields.email?.[0],
      });

      return;
    }
    setLoading(true);

    try {
      const { ok, fields, error } = await authPost(
        "/api/auth/forgot-password",
        parsed.data,
      );

      if (!ok) {
        if (fields)
          setFieldErrors({
            email: fields.email?.[0],
          });
        else setError(error ?? FALLBACK);
        return;
      }

      // Success - redirect to /auth?verify=reset-sent
      router.push("/auth?verify=reset-sent");
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="AuthForm"
      onSubmit={async (e) => {
        e.preventDefault();
        await handleForgotPassword();
      }}
    >
      <h2 className="AuthFormTitle">
        <DisplayText>Reset your password</DisplayText>
      </h2>

      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        error={fieldErrors?.email}
        autoComplete="email"
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button className="AuthSubmitButton" type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send password reset email"}
      </Button>
      <div className="AuthLinks AuthSingleLink">
        <Link href="/auth">
          <TechText className="text-xs">Back to log in</TechText>
        </Link>
      </div>
    </form>
  );
}
