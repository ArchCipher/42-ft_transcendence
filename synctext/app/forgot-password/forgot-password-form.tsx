"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";

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
      className="ForgotPasswordBox"
      onSubmit={async (e) => {
        e.preventDefault(); // don't reload the page
        await handleForgotPassword(); // handle it with JS
      }}
    >
      <label htmlFor="email">Email</label>
      <input
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

      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send password reset email"}
      </button>
      <div className="RegisterLinks">
        <Link href="/auth">Log in</Link>
      </div>
    </form>
  );
}
