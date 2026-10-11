"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authPost, FALLBACK } from "../auth/api";

import { DisplayText, TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import ErrorNote from "../components/form/ErrorNote";
import { isPasswordStrong } from "@/lib/auth/password-strength";
import { registerSchema } from "@/lib/auth/validation";
import { USERNAME_MAX } from "@synctext/shared";

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

  const passwordStrength = useMemo(
    () => (password ? isPasswordStrong(password, [email, username]) : null),
    [password, email, username]
  );

  // calls /api/auth/register and either sets error or calls /auth?verify=pending
  async function handleRegister() {
    setError("");
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const parsed = registerSchema.safeParse({
      email,
      username,
      password,
    });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;

      setFieldErrors({
        email: fields.email?.[0],
        username: fields.username?.[0],
        password: fields.password?.[0],
      });

      return;
    }

    setLoading(true);

    try {
      const { ok, fields, error } = await authPost(
        "/api/auth/register",
        parsed.data,
      );

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
      <h1 className="AuthFormTitle">
        <DisplayText>Create your account</DisplayText>
      </h1>
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
        id="username"
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={USERNAME_MAX}
        required
        error={fieldErrors?.username}
        autoComplete="username"
      />

      <Field
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        error={fieldErrors?.password}
        autoComplete="new-password"
      />

      {passwordStrength && (
        <div className="PasswordStrength">
          <TechText className="text-xs">
            Password strength: {passwordStrength.score}/4
          </TechText>

          <div
            className="PasswordStrengthBar"
            aria-label={`Password strength ${passwordStrength.score} out of 4`}
          >
            {[1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={
                  level <= passwordStrength.score
                    ? "PasswordStrengthSegment PasswordStrengthSegmentActive"
                    : "PasswordStrengthSegment"
                }
              />
            ))}
          </div>

          {passwordStrength.feedback && (
            <TechText className="text-xs">
              {passwordStrength.feedback}
            </TechText>
          )}
        </div>
      )}

      <Field
        id="confirm-password"
        label="Confirm password"
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

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button className="AuthSubmitButton" type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </Button>
      <div className="AuthLinks AuthSingleLink">
        <Link href="/auth">
          <TechText className="text-xs">
            Already have an account? Log in
          </TechText>
        </Link>
      </div>
    </form>
  );
}
