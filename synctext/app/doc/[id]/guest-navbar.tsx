"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clock3, Lock, Pencil, Unlock } from "lucide-react";

import InputBox from "@/app/components/form/InputBox";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";

import styles from "./guest-navbar.module.css";
import ErrorNote from "@/app/components/form/ErrorNote";
import buttonStyles from "@/app/components/ui/Button.module.css";

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
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

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
    setMounted(true);
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
		<div className={styles.rightControls}>
        <div
          className={`${styles.countdown} ${inGrace ? styles.countdownReadOnly : ""}`}
          aria-label={`${formatTime(remainingSeconds)} left to edit`}
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
		  <Link
          href="/auth"
          className={[
            buttonStyles.button,
            buttonStyles.outline,
            styles.loginLink,
          ].join(" ")}
        >
          <TechText className="text-xs">Save</TechText>
        </Link>
        </div>

        <div className={styles.titleArea}>
          {isEditing ? (
            <form
              className={styles.renameForm}
              onSubmit={(event) => {
                event.preventDefault();
                void saveTitle();
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  cancelEditing();
              }}
            >
              <InputBox
                autoFocus
                value={draftTitle}
                maxLength={120}
                disabled={isRenaming}
                aria-label="Document title"
                aria-describedby={
                  renameError ? "guest-document-rename-error" : undefined
                }
                onChange={(event) => setDraftTitle(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") cancelEditing();
                }}
              />
              <Button
                type="submit"
                compact
                disabled={isRenaming || !draftTitle.trim()}
              >
                <Check aria-hidden="true" size={16} />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              disabled={!canRename}
              onClick={() => {
                setDraftTitle(title);
                setIsEditing(true);
              }}
              className={styles.titleButton}
              title={
                canRename
                  ? "Rename document"
                  : "Temporary document is read-only"
              }
            >
              <span>{title}</span>
              {canRename ? <Pencil aria-hidden="true" size={14} /> : null}
            </button>
          )}
          {renameError ? (
            <div className="mt-2">
              <ErrorNote id="guest-document-rename-error">
                {renameError}
              </ErrorNote>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
