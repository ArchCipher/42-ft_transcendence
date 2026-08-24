"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";

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
      className="RegisterBox"
      onSubmit={async (e) => {
        e.preventDefault(); // don't relaoad the page
        await handleRegister(); // handle it with JS
      }}
    >
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
        name="username"
        type="username"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        autoComplete="username"
      />
      {fieldErrors.username && <p className="error">{fieldErrors.username}</p>}

      <input
        name="password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      {fieldErrors.password && <p className="error">{fieldErrors.password}</p>}

      <input
        name="confirm-password"
        type="password"
        placeholder="Retype Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </button>
      <div className="RegisterLinks">
        <Link href="/auth">Log in</Link>
      </div>
    </form>
  );
}
