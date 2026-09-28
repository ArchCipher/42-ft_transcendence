"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Lock, Unlock } from "lucide-react";

import styles from "./document-navbar.module.css";
import { DocumentTitle } from "./document-title";
import Button from "@/app/components/ui/Button";
import { SaveGuestDialog } from "./save-guest-dialog";
import { useHydrated } from "@/hooks/use-hydrated";

type GuestDocumentNavbarProps = {
  docId: string;
  initialTitle: string;
  editExpiresAt: string;
  expiresAt: string;
  canRename: boolean;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

// The guest header shares the document navbar's visual shell, but replaces
// account controls with the temporary-session countdown.
export function GuestDocumentNavbar({
  docId,
  initialTitle,
  editExpiresAt,
  expiresAt,
  canRename,
}: GuestDocumentNavbarProps) {
  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [now, setNow] = useState(()=> Date.now());
  const [saveOpen, setSaveOpen] = useState(false);

  const mounted = useHydrated();

  const editDeadline = new Date(editExpiresAt).getTime();
  const sessionDeadline = new Date(expiresAt).getTime();
  const editRemaining = mounted
    ? Math.max(0, Math.ceil((editDeadline - now) / 1000))
    : 0;
  const sessionRemaining = mounted
    ? Math.max(0, Math.ceil((sessionDeadline - now) / 1000))
    : 0;

  // At 0, the edit window is over, show 5-minute grace
  const inGrace = mounted && editRemaining <= 0;
  const remainingSeconds = inGrace ? sessionRemaining : editRemaining;
  const progress = Math.min(
    100,
    Math.max(0, (remainingSeconds / (30 * 60)) * 100),
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const gracePrompted = useRef(false);

  useEffect(() => {
    if (inGrace && !gracePrompted.current) {
      gracePrompted.current = true;
      setSaveOpen(true);
    }
  }, [inGrace]);

  function cancelEditing() {
    setDraftTitle(title);
    setRenameError("");
    setIsEditing(false);
  }

  async function saveTitle() {
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === title) {
      cancelEditing();
      return;
    }

    setIsRenaming(true);
    setRenameError("");
    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(docId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        },
      );
      if (!response.ok) throw new Error("Could not rename document");

      const document = (await response.json()) as { title: string };
      setTitle(document.title);
      setDraftTitle(document.title);
      setIsEditing(false);
    } catch {
      setRenameError("Could not rename document");
    } finally {
      setIsRenaming(false);
    }
  }

  return (
    <header className={`${styles.guestNavbar}`}>
      <nav
        aria-label="Temporary document navigation"
        className={styles.navigation}
      >
        {/* Document title */}
        <DocumentTitle
          title={title}
          draftTitle={draftTitle}
          isEditing={isEditing}
          isRenaming={isRenaming}
          renameError={renameError}
          canRename={canRename}
          errorId="guest-document-rename-error"
          readOnlyHint="Temporary document is read-only"
          onStartEdit={() => {
            setDraftTitle(title);
            setIsEditing(true);
          }}
          onDraftChange={setDraftTitle}
          onSubmit={() => void saveTitle()}
          onCancel={cancelEditing}
        />

        {/* Right: timer + save */}
        <div className={styles.rightControls}>
          <div
            className={`${styles.countdown} ${inGrace ? styles.countdownReadOnly : ""}`}
            aria-label={`${formatTime(remainingSeconds)} left on this session`}
          >
            <time
              dateTime={`PT${remainingSeconds}S`}
              className={styles.countdownTime}
            >
              {mounted ? formatTime(remainingSeconds) : "--:--"}
            </time>
            <div className={styles.countdownMeta}>
              {!mounted ? (
                <Clock3 aria-hidden="true" size={14} />
              ) : inGrace ? (
                <Lock aria-hidden="true" size={14} />
              ) : (
                <Unlock aria-hidden="true" size={14} />
              )}
            </div>
            <span className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressValue}
                style={{ width: `${progress}%` }}
              />
            </span>
          </div>
          <Button variant="outline" onClick={() => setSaveOpen(true)}>
            Save
          </Button>
          <SaveGuestDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            sessionRemaining={sessionRemaining}
            grace={inGrace}
          />
        </div>
      </nav>
    </header>
  );
}
