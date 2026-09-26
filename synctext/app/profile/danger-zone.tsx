"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./Profile.module.css";
import Button from "@/app/components/ui/Button";
import ConfirmWindow from "@/app/components/feedback/ConfirmWindow";
import {
  LOGGED_OUT_URL,
  logoutClient,
  notifySignedOut,
} from "@/lib/auth/session-state";
import type { Status } from "./profile-client";

const FALLBACK = "Something went wrong. Please try again.";

export default function DangerZone({
  onStatus,
}: {
  onStatus: (status: Status) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  async function handleDelete() {
    setDeleting(true);

    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        onStatus({ kind: "error", text: FALLBACK });
        setShowDelete(false);
        return;
      }
      notifySignedOut();
      router.push(LOGGED_OUT_URL);
    } catch {
      onStatus({ kind: "error", text: FALLBACK });
      setShowDelete(false);
      setDeleting(false);
    }
  }
  return (
    <>
      <div className={styles.zoneRow}>
        <Button
          variant="outline"
          onClick={() => void logoutClient(() => router.push(LOGGED_OUT_URL))}
        >
          Log out
        </Button>
      </div>

      <div className={styles.zoneRow}>
        <Button
          variant="danger"
          className={styles.dangerButton}
          onClick={() => setShowDelete(true)}
        >
          Delete account
        </Button>
      </div>

      {showDelete && (
        <ConfirmWindow
          title="Delete account?"
          message="This permanently deletes your account and documents. This cannot be undone."
          confirmLabel="Delete account"
          onCancel={() => setShowDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  );
}
