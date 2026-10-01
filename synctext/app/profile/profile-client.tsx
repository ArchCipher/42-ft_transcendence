"use client";

import styles from "./Profile.module.css";
import { DisplayText, TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import Field from "@/app/components/form/Field";
import Avatar from "./avatar";
import DangerZone from "./danger-zone";
import PasswordForm from "./password-form";
import { useEffect, useRef, useState } from "react";
import AuthPageShell from "../components/auth/AuthPageShell";
import UserNavbar from "../components/navigation/UserNavbar";
import StatusNotice from "../components/form/StatusNotice";
import { usernameSchema } from "@/lib/auth/validation";
import ConnectedAccounts from "./connected-accounts";

const FALLBACK = "Something went wrong. Please try again.";

type ProfileInput = {
  username: string;
  email: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  hasPassword: boolean;
};

export type Status = { kind: "error" | "saved"; text: string } | null;

type FieldErrors = { username?: string };

export default function ProfileClient({
  initial,
  oauthEnabled,
  googleLinked,
  initialNotice,
}: {
  initial: ProfileInput;
  oauthEnabled: boolean;
  googleLinked: boolean;
  initialNotice: { text: string; kind: "saved" | "error" } | null;
}) {
  const [username, setUsername] = useState(initial.username);
  const [saved, setSaved] = useState({
    username: initial.username,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>(initialNotice);
  const [saving, setSaving] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const lastStatus = useRef<Status>(initialNotice);

  useEffect(() => {
    if (!status || status === lastStatus.current) return;
    lastStatus.current = status;
    noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    noticeRef.current?.focus({ preventScroll: true });
  }, [status]);

  function isRealEdit(value: string, saved: string): boolean {
    return value.trim().toLowerCase() !== saved.trim().toLowerCase();
  }

  const dirty = isRealEdit(username, saved.username);

  const memberSince = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(initial.createdAt));

  function handleCancel() {
    setUsername(saved.username);
    setFieldErrors({});
    setStatus(null);
  }

  async function handleSave() {
    setFieldErrors({});
    setStatus(null);

    const parsed = usernameSchema.safeParse(username);

    if (!parsed.success) {
      setFieldErrors({
        username: parsed.error.issues[0]?.message,
      });
      return;
    }

    const body = { username: parsed.data };
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

      setUsername(parsed.data);
      setSaved({ username: parsed.data });
      setStatus({ kind: "saved", text: "Saved." });
    } catch {
      setStatus({ kind: "error", text: FALLBACK });
    } finally {
      setSaving(false);
    }
  }
  return (
    <AuthPageShell
      navbar={
        <UserNavbar username={initial.username} avatarUrl={initial.avatarUrl} />
      }
      notice={
        status && (
          <div ref={noticeRef} tabIndex={-1}>
            <StatusNotice role={status.kind === "error" ? "alert" : "status"}>
              {status.text}
            </StatusNotice>
          </div>
        )
      }
    >
      <div className={styles.profileBody}>
        <div className={styles.headerRow}>
          <div className={styles.headerCopy}>
            <TechText className={styles.kicker}>Profile</TechText>
            <h1>
              <DisplayText className={styles.title}>
                {saved.username}
              </DisplayText>
            </h1>
          </div>

          <Avatar
            initialAvatarUrl={initial.avatarUrl}
            username={saved.username}
            onStatus={setStatus}
          />
        </div>

        <div className={styles.metaRow}>
          <span className={styles.badge}>Member since {memberSince} (UTC)</span>
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
        <PasswordForm
          onStatus={setStatus}
          username={saved.username}
          email={initial.email}
		  hasPassword={initial.hasPassword}
        />

        <div className={styles.actionsRow}>
          <Button
            variant="primary"
            disabled={!dirty || saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>

          <Button variant="outline" disabled={!dirty} onClick={handleCancel}>
            Cancel
          </Button>
        </div>

        <hr className={styles.divider} />

        <ConnectedAccounts
          enabled={oauthEnabled}
          linked={googleLinked}
          onStatus={setStatus}
        />
        <DangerZone onStatus={setStatus} />
      </div>
    </AuthPageShell>
  );
}
