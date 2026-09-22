"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, Clock3, Pencil } from "lucide-react"

import InputBox from "@/app/components/form/InputBox"
import Logo from "@/app/components/header/Logo"
import { TechText } from "@/app/components/typography/Typography"
import Button from "@/app/components/ui/Button"

import sharedStyles from "./navbar.module.css"
import styles from "./guest-navbar.module.css"

type GuestDocumentNavbarProps = {
  docId: string
  initialTitle: string
  editExpiresAt: string
  canRename: boolean
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}

// The guest header shares the document navbar's visual shell, but replaces
// account controls with the temporary-session countdown.
export function GuestDocumentNavbar({
  docId,
  initialTitle,
  editExpiresAt,
  canRename,
}: GuestDocumentNavbarProps) {
  const [title, setTitle] = useState(initialTitle)
  const [draftTitle, setDraftTitle] = useState(initialTitle)
  const [isEditing, setIsEditing] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState("")
  const [now, setNow] = useState(() => Date.now())

  const editDeadline = new Date(editExpiresAt).getTime()
  const remainingSeconds = Math.max(0, Math.ceil((editDeadline - now) / 1000))
  const progress = Math.min(100, Math.max(0, (remainingSeconds / (30 * 60)) * 100))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function cancelEditing() {
    setDraftTitle(title)
    setRenameError("")
    setIsEditing(false)
  }

  async function saveTitle() {
    const nextTitle = draftTitle.trim()
    if (!nextTitle || nextTitle === title) {
      cancelEditing()
      return
    }

    setIsRenaming(true)
    setRenameError("")
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      })
      if (!response.ok) throw new Error("Could not rename document")

      const document = (await response.json()) as { title: string }
      setTitle(document.title)
      setDraftTitle(document.title)
      setIsEditing(false)
    } catch {
      setRenameError("Could not rename document")
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <header className={`${sharedStyles.editorNavbar} ${styles.guestNavbar}`}>
      <nav aria-label="Temporary document navigation" className={styles.navigation}>
        <div className={styles.brand}>
          <Logo className={styles.logo} href="/" />
        </div>

        <div className={styles.titleArea}>
          {isEditing ? (
            <form
              className={styles.renameForm}
              onSubmit={(event) => {
                event.preventDefault()
                void saveTitle()
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) cancelEditing()
              }}
            >
              <InputBox
                autoFocus
                value={draftTitle}
                maxLength={120}
                disabled={isRenaming}
                aria-label="Document title"
                aria-describedby={renameError ? "guest-document-rename-error" : undefined}
                onChange={(event) => setDraftTitle(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") cancelEditing()
                }}
              />
              <Button type="submit" compact disabled={isRenaming || !draftTitle.trim()}>
                <Check aria-hidden="true" size={16} />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              disabled={!canRename}
              onClick={() => {
                setDraftTitle(title)
                setIsEditing(true)
              }}
              className={styles.titleButton}
              title={canRename ? "Rename document" : "Temporary document is read-only"}
            >
              <span>{title}</span>
              {canRename ? <Pencil aria-hidden="true" size={14} /> : null}
            </button>
          )}
          {renameError ? (
            <p id="guest-document-rename-error" role="alert" className={styles.renameError}>
              {renameError}
            </p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <div className={styles.countdown} aria-label={`${formatTime(remainingSeconds)} left to edit`}>
            <div className={styles.countdownMeta}>
              <Clock3 aria-hidden="true" size={14} />
              <TechText className={styles.countdownLabel}>
                {remainingSeconds > 0 ? "Writing window" : "Read only"}
              </TechText>
            </div>
            <time dateTime={`PT${remainingSeconds}S`} className={styles.countdownTime}>
              {formatTime(remainingSeconds)}
            </time>
            <span className={styles.progressTrack} aria-hidden="true">
              <span className={styles.progressValue} style={{ width: `${progress}%` }} />
            </span>
          </div>

          <Link href="/auth" className={styles.loginLink}>
            <TechText className="text-xs">Log in to save</TechText>
          </Link>
        </div>
      </nav>
    </header>
  )
}
