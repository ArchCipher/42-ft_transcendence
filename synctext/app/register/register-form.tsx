"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
	username?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // calls /api/auth/register and either sets error or calls /login
  async function handleRegister(email: string, username: string, password: string) {
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();
      const fields = data.fields;

      if (!res.ok || fields) {
        if (fields)
          setFieldErrors({
            email: fields.email?.[0],
			username: fields.username?.[0],
            password: fields.password?.[0],
          });
        else if (res.status === 409) {
          setError("Email or username already exists"); // is this supporting enumeration? or will this be caught in fields?
        } else if (res.status === 429) {
          setError("Too many attempts. Try again later");
        } else {
          setError("Something went wrong. Please try again");
        }
        return;
      }

      // Success - redirect to login - should say verify your email?
      router.push("/auth?verify=pending");
    } catch {
      setError("Something went wrong. Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="RegisterBox"
      onSubmit={async (e) => {
        e.preventDefault(); // don't relaoad the page
        await handleRegister(email, username, password); // handle it with JS
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
        autoComplete="current-password"
      />
      {fieldErrors.password && <p className="error">{fieldErrors.password}</p>}

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
