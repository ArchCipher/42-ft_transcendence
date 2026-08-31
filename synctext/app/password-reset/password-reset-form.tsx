"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";

export default function PasswordResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(
    token ? "" : "Missing reset token in the link",
  );
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // calls /api/auth/password-reset
  async function handlePasswordReset() {
    setFieldErrors({});
    if (!token) {
      setError("Missing reset token in the link");
      return;
    }
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { ok, fields, error } = await authPost("/api/auth/reset-password", {
        token,
        password,
      });

      if (!ok) {
        if (fields)
          setFieldErrors({
            password: fields.password?.[0],
          });
        else setError(error ?? FALLBACK);
        return;
      }

      // Success - redirect to /auth?verify=reset-done
      router.push("/auth?verify=reset-done");
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="PasswordResetBox"
      onSubmit={async (e) => {
        e.preventDefault(); // don't reload the page
        await handlePasswordReset(); // handle it with JS
      }}
    >
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        placeholder="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-invalid={!!fieldErrors?.password}
        aria-describedby={fieldErrors?.password ? "password-error" : undefined}
        autoComplete="new-password"
      />
      {fieldErrors?.password && (
        <p id="password-error" className="FieldError">
          {fieldErrors.password}
        </p>
      )}

      <label htmlFor="confirm-password">Confirm password</label>
      <input
        id="confirm-password"
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      {error && (
        <p className="FormError" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading || !token}>
        {loading ? "Resetting..." : "Reset password"}
      </button>
      <div className="RegisterLinks">
        <Link href="/auth">Log in</Link>
      </div>
    </form>
  );
}
