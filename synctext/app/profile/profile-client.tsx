"use client";

import styles from "./Profile.module.css";
import { DisplayText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import Avatar from "./avatar";
import DangerZone from "./danger-zone";
import PasswordForm from "./password-form";
import { useState } from "react";

const FALLBACK = "Something went wrong. Please try again.";

type ProfileInput = {
  username: string;
  email: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type Status = { kind: "error" | "saved"; text: string } | null;

type FieldErrors = { username?: string };

export default function ProfileClient({ initial }: { initial: ProfileInput }) {
  const [username, setUsername] = useState(initial.username);
  const [saved, setSaved] = useState({
    username: initial.username,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  const dirty = username !== saved.username;

  const memberSince = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(initial.createdAt));

  function isRealEdit(value: string, saved: string): boolean {
    return value !== saved && value.trim().toLowerCase() !== saved;
  }

  function handleCancel() {
    setUsername(saved.username);
    setFieldErrors({});
    setStatus(null);
  }

  async function handleSave() {
    setFieldErrors({});
    setStatus(null);

    if (!dirty) return;

    // Usernames and emails are canonicalized to lowercase server-side, so a
    // change in casing alone is not a real edit.
    const body: Record<string, string> = {};
    if (isRealEdit(username, saved.username)) body.username = username;

    if (Object.keys(body).length === 0) {
      setStatus({
        kind: "error",
        text: "Nothing to save — usernames and emails are case-insensitive.",
      });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFieldErrors({
          username: data?.fields?.username?.[0],
        });
        setStatus({
          kind: "error",
          text: data?.error ?? FALLBACK,
        });
        return;
      }

      setSaved({ username });
      setStatus({ kind: "saved", text: "Saved." });
    } catch {
      setStatus({ kind: "error", text: FALLBACK });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className={styles.profileBody}>
      {status && (
        <p
          role={status.kind === "error" ? "alert" : undefined}
          aria-live="polite"
          className={`${styles.statusNotice}${
            status.kind === "error" ? ` ${styles.statusNoticeError}` : ""
          }`}
        >
          {status.text}
        </p>
      )}

      <div className={styles.headerRow}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>Profile</p>
          <h1 className={styles.title}>
            <DisplayText>{saved.username}</DisplayText>
          </h1>
        </div>

        <Avatar
          initialAvatarUrl={initial.avatarUrl}
          username={saved.username}
          onStatus={setStatus}
        />
      </div>

      <div className={styles.metaRow}>
        <span className={styles.badge}>Member since {memberSince}</span>
        <span
          className={
            initial.emailVerifiedAt
              ? styles.badge
              : `${styles.badge} ${styles.badgeUnverified}`
          }
        >
          Email {initial.emailVerifiedAt ? "verified" : "not verified"}
        </span>
      </div>

      <div className={styles.fieldGroup}>
        <Field
          id="profile-username"
          label="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setFieldErrors((prev) => ({ ...prev, username: undefined }));
            setStatus(null);
          }}
          maxLength={32}
          error={fieldErrors?.username}
          autoComplete="username"
        />
      </div>

      <div className={styles.fieldGroup}>
        <Field
          id="profile-email"
          label="Email"
          type="email"
          value={initial.email}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          autoComplete="off"
        />
        <PasswordForm onStatus={setStatus} />
      </div>

      <div className={styles.actionsRow}>
        <Button
          className={styles.saveButton}
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving..." : "Save"}
        </Button>

        <Button
          variant="outline"
          compact
          disabled={!dirty}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>

      <hr className={styles.divider} />

      <DangerZone onStatus={setStatus} />
    </div>
  );
}
