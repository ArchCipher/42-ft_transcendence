"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

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

// Guest documents intentionally use a pared-back header: editable title,
// thirty-minute writing timer, and the path to save the document by logging in.
export function GuestDocumentNavbar({
  docId,
  initialTitle,
  editExpiresAt,
  canRename,
}: GuestDocumentNavbarProps) {
  const [title, setTitle] = useState(initialTitle)
  const [draftTitle, setDraftTitle] = useState(initialTitle)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(editExpiresAt).getTime() - now) / 1000),
  )

  async function saveTitle() {
    const nextTitle = draftTitle.trim()
    if (!nextTitle || nextTitle === title || !canRename) {
      setDraftTitle(title)
      return
    }

    const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    })
    if (!response.ok) {
      setDraftTitle(title)
      return
    }

    const document = (await response.json()) as { title: string }
    setTitle(document.title)
    setDraftTitle(document.title)
  }

  return (
    <header className="relative z-20 border-b border-white/15 bg-[oklch(0.12_0.006_285)] font-mono text-[#f4f2ee]">
      <nav
        aria-label="Guest document navigation"
        className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:px-6"
      >
        <time
          dateTime={`PT${remainingSeconds}S`}
          aria-label={`${formatTime(remainingSeconds)} left to edit`}
          className="whitespace-nowrap text-sm tabular-nums text-white/75"
        >
          {formatTime(remainingSeconds)}
        </time>

        <form
          className="min-w-0"
          onSubmit={(event) => {
            event.preventDefault()
            void saveTitle()
          }}
        >
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => void saveTitle()}
            disabled={!canRename}
            maxLength={120}
            aria-label="Document title"
            className="min-h-10 w-full bg-transparent px-3 text-center text-sm text-white outline-none placeholder:text-white/35 focus:bg-white/5 disabled:cursor-default"
          />
        </form>

        <Link
          href="/auth"
          className="border border-white/25 px-3 py-2 text-xs transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Log in
        </Link>
      </nav>
    </header>
  )
}
