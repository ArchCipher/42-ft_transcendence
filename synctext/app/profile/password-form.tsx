"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";

import styles from "./Profile.module.css";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import type { Status } from "./profile-client";

const FALLBACK = "Something went wrong. Please try again.";

type PasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function PasswordForm({
  onStatus,
}: {
  onStatus: (status: Status) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});

  async function handleChangePassword() {
    setError(null);
    setFieldErrors({});
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFieldErrors({
        currentPassword: currentPassword
          ? undefined
          : "Enter your current password",
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
    if (currentPassword === newPassword) {
      setFieldErrors({
        newPassword: "New password cannot be same as your current password.",
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
          {showForm ? "Hide password change" : "Change password"}
        </TechText>
      </button>

      {showForm && (
        <div
          className={styles.passwordForm}
          role="group"
          aria-label="Change password"
        >
          <Field
            id="profile-current-password"
            label="Current password"
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            error={fieldErrors.currentPassword}
            onChange={onFieldChange(setCurrentPassword, "currentPassword")}
            autoComplete="current-password"
          />

          <Field
            id="profile-new-password"
            label="New password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            error={fieldErrors.newPassword}
            onChange={onFieldChange(setNewPassword, "newPassword")}
            autoComplete="new-password"
          />

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

          {error && (
            <p className={styles.fieldError} role="alert">
              {error}
            </p>
          )}

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
