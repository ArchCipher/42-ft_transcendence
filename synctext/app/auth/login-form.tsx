"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "./api";
import { notifySignedIn } from "@/lib/auth/session-state";

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

      // broadcast sign in to other tabs
      notifySignedIn();

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
      {/*<h2>Access the Guide</h2>*/}

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

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
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
          {fieldErrors.password}
        </p>
      )}

      {error && (
        <p className="FormError" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Accessing..." : "Access the Guide"}
      </button>
      <div className="LoginLinks">
        <Link href="/register">Create account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}
