"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";
import Box from "@/components/Box";
import Button from "@/components/Button";
import { DisplayText, TechText } from "@/components/Typography";

export default function PasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
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
      const { ok, fields, error } = await authPost("/api/auth/password-reset", {
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
      className="AuthForm"
      onSubmit={async (e) => {
        e.preventDefault();
        await handlePasswordReset();
      }}
    >
      <h2 className="AuthFormTitle">
        <DisplayText>Choose a new password</DisplayText>
      </h2>

      <label htmlFor="password">
        <TechText className="text-xs">Password</TechText>
      </label>

      <Box
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

      <label htmlFor="confirm-password">
        <TechText className="text-xs">Confirm password</TechText>
      </label>

      <Box
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

      <Button type="submit" disabled={loading || !token}>
        {loading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
