"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";

import { DisplayText, TechText } from "@/components/Typography";
import Button from "@/components/Button";
import Box from "@/components/Box";

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
    <form className="RegisterBox"
          onSubmit={async (e) => {
          e.preventDefault(); // don't reload the page
          await handleRegister(); // handle it with JS
      }}
    >
      <h2 className="RegisterTitle">
        <DisplayText>Create your account</DisplayText>
      </h2>
      <label htmlFor="email">
        <TechText className="text-xs">Email</TechText>
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
          {fieldErrors.email}
        </p>
      )}

      <label htmlFor="username">
        <TechText className="text-xs">Username</TechText>
      </label>
      <Box
        id="username"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        aria-invalid={!!fieldErrors?.username}
        aria-describedby={fieldErrors?.username ? "username-error" : undefined}
        autoComplete="username"
      />
      {fieldErrors?.username && (
        <p id="username-error" className="FieldError">
          {fieldErrors.username}
        </p>
      )}

      <label htmlFor="password">
        <TechText className="text-xs">Password</TechText>
      </label>
      <Box
        id="password"
        type="password"
        placeholder="Password"
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

      <Button type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </Button>
      </form>
  );
}
