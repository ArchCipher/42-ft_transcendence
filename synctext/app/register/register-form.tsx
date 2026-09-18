"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";

import { DisplayText, TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Box from "@/app/components/form/Box";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // calls /api/auth/register and either sets error or calls /auth?verify=pending
  async function handleRegister() {
    setError("");
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { ok, fields, error } = await authPost("/api/auth/register", {
        email,
        username,
        password,
      });

      if (!ok) {
        if (fields)
          setFieldErrors({
            email: fields.email?.[0],
            username: fields.username?.[0],
            password: fields.password?.[0],
          });
        else setError(error ?? FALLBACK);
        return;
      }

      // Success - redirect to /auth?verify=pending
      router.push("/auth?verify=pending");
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
        await handleRegister();
      }}
    >
      <h2 className="AuthFormTitle">
        <DisplayText>Create your account</DisplayText>
      </h2>
      <label htmlFor="email">
        <TechText className="text-xs">Email</TechText>
      </label>
      <Box
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-invalid={!!fieldErrors?.email}
        aria-describedby={fieldErrors?.email ? "email-error" : undefined}
        autoComplete="email"
      />
      {fieldErrors?.email && (
        <p id="email-error" className="FieldError">
          <TechText className="text-xs">{fieldErrors.email}</TechText>
        </p>
      )}

      <label htmlFor="username">
        <TechText className="text-xs">Username</TechText>
      </label>
      <Box
        id="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={32}
        required
        aria-invalid={!!fieldErrors?.username}
        aria-describedby={fieldErrors?.username ? "username-error" : undefined}
        autoComplete="username"
      />
      {fieldErrors?.username && (
        <p id="username-error" className="FieldError">
          <TechText className="text-xs">{fieldErrors.username}</TechText>
        </p>
      )}

      <label htmlFor="password">
        <TechText className="text-xs">Password</TechText>
      </label>
      <Box
        id="password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-invalid={!!fieldErrors?.password}
        aria-describedby={fieldErrors?.password ? "password-error" : undefined}
        autoComplete="new-password"
      />
      {fieldErrors?.password && (
        <p id="password-error" className="FieldError">
          <TechText className="text-xs">{fieldErrors.password}</TechText>
        </p>
      )}

      <label htmlFor="confirm-password">
        <TechText className="text-xs">Confirm password</TechText>
      </label>
      <Box
        id="confirm-password"
        type={showPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      <label className="ShowPassword">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        <TechText className="text-xs">Show password</TechText>
      </label>

      {error && (
        <p className="FormError" role="alert">
          <TechText className="text-xs">{error}</TechText>
        </p>
      )}

      <Button className="AuthSubmitButton" type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </Button>
      <div className="AuthLinks AuthSingleLink">
        <Link href="/auth"><TechText className="text-xs">Already have an account? Log in</TechText></Link>
      </div>
    </form>
  );
}
