"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "./api";
import { DisplayText, TechText } from "@/components/Typography";
import Button from "@/components/Button";
import Box from "@/components/Box";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // calls /api/auth/login and either sets error or calls /dashboard
  async function handleLogin() {
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const { ok, fields, error } = await authPost("/api/auth/login", {
        email,
        password,
      });

      if (!ok) {
        if (fields)
          setFieldErrors({
            email: fields.email?.[0],
            password: fields.password?.[0],
          });
        else setError(error ?? FALLBACK);
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="LoginBox"
      onSubmit={async (e) => {
        e.preventDefault(); // don't reload the page
        await handleLogin(); // handle it with JS
      }}
    >
      <h2 className="LoginTitle">
        <DisplayText>
          Access the Guide
        </DisplayText>
      </h2>

      <label htmlFor="email">
        <TechText className="text-xs">
          Email
        </TechText>
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
          <TechText className="text-xs">{fieldErrors.email}</TechText>
        </p>
      )}

      <label htmlFor="password">
        <TechText className="text-xs">
          Password
        </TechText>
      </label>
      <Box
        id="password"
        type={showPassword ? "text" : "password"}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-invalid={!!fieldErrors?.password}
        aria-describedby={fieldErrors?.password ? "password-error" : undefined}
        autoComplete="current-password"
      />
      {fieldErrors?.password && (
        <p id="password-error" className="FieldError">
          <TechText className="text-xs">{fieldErrors.password}</TechText>
        </p>
      )}

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

      <Button type="submit" disabled={loading}>
        {loading ? "Accessing..." : "Access the Guide"}
      </Button>
      <div className="LoginLinks">
        <Link href="/register">
          <TechText className="text-xs text-[#6fd3ff]">
            Create account
          </TechText>
        </Link>
        <Link href="/forgot-password">
          <TechText className="text-xs text-[#6fd3ff]">
            Forgot password?
          </TechText>
        </Link>
      </div>
    </form>
  );
}
