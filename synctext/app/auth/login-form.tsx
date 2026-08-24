"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "./api";

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
        e.preventDefault(); // don't relaoad the page
        await handleLogin(); // handle it with JS
      }}
    >
      {/*<h2>Access the Guide</h2>*/}

      <input
        name="email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      {fieldErrors.email && <p className="error">{fieldErrors.email}</p>}

      <input
        name="password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {fieldErrors.password && <p className="error">{fieldErrors.password}</p>}

      {error && <p className="error">{error}</p>}

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
