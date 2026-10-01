"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Status } from "./profile-client";
import styles from "./Profile.module.css";
import Button from "@/app/components/ui/Button";
import { authPost, FALLBACK } from "../auth/api";
import {
  OAUTH_ERROR_MESSAGES,
  type OAuthErrorCode,
} from "@/lib/auth/oauth/errors";

export default function ConnectedAccounts({
  enabled,
  linked,
  onStatus,
}: {
  enabled: boolean;
  linked: boolean;
  onStatus: (status: Status) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleUnlink() {
    setBusy(true);
    try {
      const res = await authPost("/api/auth/oauth/unlink", {
        provider: "google",
      });

      if (res.ok) {
        onStatus({
          kind: "saved",
          text: "Google sign-in removed.",
        });
        router.refresh();
        return;
      }
      const message = res.error
        ? OAUTH_ERROR_MESSAGES[res.error as OAuthErrorCode]
        : FALLBACK;
      onStatus({
        kind: "error",
        text: typeof message === "string" ? message : FALLBACK,
      });
    } catch {
      onStatus({ kind: "error", text: FALLBACK });
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className={styles.zoneRow}>
      {linked ? (
        <Button variant="outline" onClick={handleUnlink} disabled={busy}>
          {busy ? "Unlinking..." : "Unlink Google account"}
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            window.location.assign(
              new URL("/api/auth/oauth?purpose=link", window.location.origin)
                .href,
            );
          }}
        >
          Link Google account
        </Button>
      )}
    </div>
  );
}
