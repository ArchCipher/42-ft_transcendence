"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";

import styles from "./Profile.module.css";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import type { Status } from "./profile-client";
import ErrorNote from "../components/form/ErrorNote";
import { isPasswordStrong } from "@/lib/auth/password-strength";

const FALLBACK = "Something went wrong. Please try again.";

type PasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function PasswordForm({
  onStatus,
  username,
  email,
  hasPassword,
}: {
  onStatus: (status: Status) => void;
  username: string;
  email: string;
  hasPassword: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});

  const passwordStrength = useMemo(
    () => newPassword
        ? isPasswordStrong(newPassword, [email, username])
        : null,
        [newPassword, email, username]
  );

  async function handleChangePassword() {
    setError(null);
    setFieldErrors({});
    if ((hasPassword && !currentPassword) || !newPassword || !confirmPassword) {
      setFieldErrors({
        currentPassword:
          hasPassword && !currentPassword ? "Enter your current password"
            : undefined,
        newPassword: newPassword ? undefined : "Enter a new password",
        confirmPassword: confirmPassword
          ? undefined
          : "Confirm your new password",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }
    if (hasPassword && currentPassword === newPassword) {
      setFieldErrors({
        newPassword: "New password cannot be same as your current password.",
      });
      return;
    }

    const strength = isPasswordStrong(newPassword, [username, email]);

    if (!strength.ok) {
      setFieldErrors({
        newPassword: strength.feedback || "Password is too weak.",
      });
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFieldErrors({
          currentPassword: data?.fields?.currentPassword?.[0],
          newPassword: data?.fields?.newPassword?.[0],
          confirmPassword: data?.fields?.confirmPassword?.[0],
        });
        setError(data?.error ?? FALLBACK);
        return;
      }
      onStatus({ kind: "saved", text: "Password changed." });
      reset();
    } catch {
      setError(FALLBACK);
    } finally {
      setBusy(false);
    }
  }

  function onFieldChange(
    set: (v: string) => void,
    field: keyof typeof fieldErrors,
  ) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      set(e.target.value);
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setError(null);
    };
  }

  function reset() {
    setShowForm(false);
    setError(null);
    setFieldErrors({});
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }
  return (
    <>
      <button
        type="button"
        className={`${styles.passLink} ${styles.linkRow}`}
        onClick={() => setShowForm((v) => !v)}
      >
        <TechText className="text-xs">
          {showForm
            ? "Hide password change"
            : hasPassword
              ? "Change password"
              : "Set a password"}
        </TechText>
      </button>

      {showForm && (
        <div
          className={styles.passwordForm}
          role="group"
          aria-label="Change password"
        >
          {hasPassword && (
            <Field
              id="profile-current-password"
              label="Current password"
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              error={fieldErrors.currentPassword}
              onChange={onFieldChange(setCurrentPassword, "currentPassword")}
              autoComplete="current-password"
            />
          )}

          <Field
            id="profile-new-password"
            label="New password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            error={fieldErrors.newPassword}
            onChange={onFieldChange(setNewPassword, "newPassword")}
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
            id="profile-confirm-password"
            label="Confirm new password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={onFieldChange(setConfirmPassword, "confirmPassword")}
            autoComplete="new-password"
          />

          <div className={styles.passwordRow}>
            <label className="ShowPassword">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <TechText className="text-xs">Show Password</TechText>
            </label>
            <Link href="/forgot-password">
              <TechText className="text-xs">Forgot password?</TechText>
            </Link>
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className={styles.actionsRow}>
            <Button
              variant="primary"
              compact
              disabled={busy}
              onClick={() => void handleChangePassword()}
            >
              {busy ? "Changing..." : "Change password"}
            </Button>
            <Button variant="outline" compact disabled={busy} onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
