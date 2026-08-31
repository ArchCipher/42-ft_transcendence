"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Check, Pencil } from "lucide-react"
import type { CollabUser } from "@hocuspocus/provider-react"
import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react"

import { renameDocument_api } from "@/app/dashboard/document/document"
import { requestSnapshot } from "@/lib/sync/sync-snapshot"

type SyncUser = { name: string; color: string }

type DocumentNavbarProps = {
  docId: string
  initialTitle: string
  user: SyncUser
  canRename: boolean
}

const STATUS_COLOR = {
  connected: "bg-emerald-400",
  connecting: "bg-amber-300",
  disconnected: "bg-zinc-500",
} as const

function collaboratorIdentity({ user }: CollabUser): SyncUser {
  const identity = (user && typeof user === "object" ? user : {}) as Record<string, unknown>
  return {
    name: typeof identity.name === "string" && identity.name ? identity.name : "?",
    color: typeof identity.color === "string" ? identity.color : "#94a3b8",
  }
}

export function DocumentNavbar({
  docId,
  initialTitle,
  user,
  canRename,
}: DocumentNavbarProps) {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()
  const [title, setTitle] = useState(initialTitle)
  const [draftTitle, setDraftTitle] = useState(initialTitle)
  const [isEditing, setIsEditing] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState("")
  const [snapshotTitle, setSnapshotTitle] = useState("")

  async function saveTitle() {
    const nextTitle = draftTitle.trim()
    if (!nextTitle || nextTitle === title) {
      setDraftTitle(title)
      setIsEditing(false)
      return
    }

    setIsRenaming(true)
    setRenameError("")
    try {
      const renamedDocument = await renameDocument_api(docId, nextTitle)
      setTitle(renamedDocument.title)
      setDraftTitle(renamedDocument.title)
      setIsEditing(false)
    } catch {
      setRenameError("Could not rename document")
    } finally {
      setIsRenaming(false)
    }
  }

  function saveSnapshot() {
    const nextSnapshotTitle = snapshotTitle.trim()
    if (!nextSnapshotTitle) return
    requestSnapshot(provider, nextSnapshotTitle)
    setSnapshotTitle("")
  }

  return (
    <header className="relative z-20 border-b border-white/15 bg-[oklch(0.12_0.006_285)] font-mono text-[#f4f2ee]">
      <nav
        aria-label="Document navigation"
        className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-2 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center gap-2 border border-white/15 px-3 text-xs text-[#f4f2ee] transition-colors hover:border-white/45 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft aria-hidden="true" size={15} />
            Dashboard
          </Link>

          <span className="hidden text-sm tracking-[-0.04em] text-white/55 sm:inline">
            SyncText<span className="text-[#8984b5]">↗</span>
          </span>
        </div>

        <div className="min-w-0 flex-1 sm:px-3">
          {isEditing ? (
            <form
              className="mx-auto flex max-w-xl items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void saveTitle()
              }}
            >
              <input
                autoFocus
                value={draftTitle}
                maxLength={120}
                disabled={isRenaming}
                aria-label="Document title"
                aria-describedby={renameError ? "document-rename-error" : undefined}
                onChange={(event) => setDraftTitle(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDraftTitle(title)
                    setRenameError("")
                    setIsEditing(false)
                  }
                }}
                className="min-h-10 min-w-0 flex-1 border border-white/25 bg-white/5 px-3 text-center text-sm text-white outline-none transition-colors focus:border-[#8984b5]"
              />
              <button
                type="submit"
                disabled={isRenaming || !draftTitle.trim()}
                aria-label="Save document title"
                className="inline-flex size-10 items-center justify-center border border-white/20 bg-[#f4f2ee] text-[#090909] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
              >
                <Check aria-hidden="true" size={16} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled={!canRename}
              onClick={() => setIsEditing(true)}
              className="mx-auto flex min-h-10 max-w-xl items-center gap-2 px-3 text-left text-sm tracking-tight text-white transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
              title={canRename ? "Rename document" : "You have view-only access"}
            >
              <span className="truncate">{title}</span>
              {canRename ? <Pencil aria-hidden="true" className="shrink-0 text-white/45" size={14} /> : null}
            </button>
          )}
          {renameError ? (
            <p id="document-rename-error" role="alert" className="mt-1 text-center text-[11px] text-red-300">
              {renameError}
            </p>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center gap-2 border border-white/15 px-2.5 py-2 text-[11px] text-white/65">
            <span className={`size-2 rounded-full ${STATUS_COLOR[status]}`} aria-hidden="true" />
            {status}
          </span>

          <div className="flex -space-x-1" aria-label={`${users.length} online`}>
            {users.map((onlineUser) => {
              const identity = collaboratorIdentity(onlineUser)
              return (
                <span
                  key={onlineUser.clientId}
                  title={identity.name}
                  className="inline-flex size-8 items-center justify-center rounded-full border-2 border-[oklch(0.12_0.006_285)] text-xs font-semibold text-white"
                  style={{ backgroundColor: identity.color }}
                >
                  {identity.name[0]?.toUpperCase()}
                </span>
              )
            })}
          </div>

          <form
            className="hidden items-center sm:flex"
            onSubmit={(event) => {
              event.preventDefault()
              saveSnapshot()
            }}
          >
            <input
              value={snapshotTitle}
              onChange={(event) => setSnapshotTitle(event.target.value)}
              placeholder="Snapshot title"
              aria-label="Snapshot title"
              className="min-h-10 w-36 border border-white/15 bg-transparent px-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/40"
            />
            <button
              type="submit"
              disabled={!snapshotTitle.trim()}
              className="min-h-10 border border-l-0 border-white/15 px-3 text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              Save
            </button>
          </form>

          <span
            className="inline-flex size-9 items-center justify-center rounded-full border-2 border-white/20 text-xs font-semibold text-white"
            style={{ backgroundColor: user.color }}
            title={user.name}
            aria-label={`Signed in as ${user.name}`}
          >
            {user.name[0]?.toUpperCase()}
          </span>
        </div>
      </nav>
    </header>
  )
}
