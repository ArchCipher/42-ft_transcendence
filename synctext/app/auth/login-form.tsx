"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "./api";
import { DisplayText, TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import ErrorNote from "../components/form/ErrorNote";

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
      const { ok, fields, error, redirectTo } = await authPost(
        "/api/auth/login",
        {
          email,
          password,
        },
      );

      if (!ok) {
        if (fields)
          setFieldErrors({
            email: fields.email?.[0],
            password: fields.password?.[0],
          });
        else setError(error ?? FALLBACK);
        return;
      }

      router.push(redirectTo ?? "/dashboard");
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
        e.preventDefault(); // don't reload the page
        await handleLogin(); // handle it with JS
      }}
    >
      <h2 className="AuthFormTitle">
        <DisplayText>Pick up where you left off.</DisplayText>
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

      <Field
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        error={fieldErrors?.password}
        autoComplete="current-password"
      />

      <label className="ShowPassword">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        <TechText className="text-xs">Show password</TechText>
      </label>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button className="AuthSubmitButton" type="submit" disabled={loading}>
        {loading ? "Accessing..." : "Login"}
      </Button>
      <div className="AuthLinks">
        <Link href="/register">
          <TechText className="text-xs text-[#6fd3ff]">Create account</TechText>
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
