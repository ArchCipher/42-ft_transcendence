"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";
import Button from "@/app/components/ui/Button";
import Box from "@/app/components/form/Box";
import { DisplayText, TechText } from "@/app/components/typography/Typography";

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
    setLoading(true);

    try {
      const { ok, fields, error } = await authPost(
        "/api/auth/forgot-password",
        { email },
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

      <label htmlFor="email">
        <TechText className="text-xs">Email</TechText>
      </label>

      <Box
        id="email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-invalid={!!fieldErrors?.email}
        aria-describedby={fieldErrors?.email ? "email-error" : undefined}
        autoComplete="email"
      />

      {fieldErrors?.email && (
        <p id="email-error" className="FieldError">
          {fieldErrors.email}
        </p>
      )}

      {error && (
        <p className="FormError" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send password reset email"}
      </Button>
    </form>
  );
}
