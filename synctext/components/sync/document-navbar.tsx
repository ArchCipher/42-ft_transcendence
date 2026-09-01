"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Check, Pencil } from "lucide-react"
import type { CollabUser, ConnectionStatus } from "@hocuspocus/provider-react"
import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react"

import { renameDocument_api } from "@/app/dashboard/document/document"
import { requestSnapshot } from "@/lib/sync/sync-snapshot"

type SyncUser = { name: string; color: string }

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

function truncateTitle(title: string, limit: number) {
  return title.length > limit ? `${title.slice(0, limit)}...` : title
}

type DocumentNavbarViewProps = {
  status: ConnectionStatus
  users: CollabUser[]
  title: string
  canRename: boolean
  isEditing: boolean
  draftTitle: string
  isRenaming: boolean
  renameError: string
  snapshotTitle: string
  onStartEditing: () => void
  onDraftTitleChange: (value: string) => void
  onSaveTitle: () => void
  onCancelEditing: () => void
  onSnapshotTitleChange: (value: string) => void
  onSaveSnapshot: () => void
  // No live provider to act on yet (pre-mount shell) — see StaticEditorShell
  // in sync-editor.tsx.
  disabled?: boolean
}

// Pure rendering, shared between the live navbar (below) and the pre-mount
// static shell in sync-editor.tsx, so both stay visually identical.
export function DocumentNavbarView({
  status,
  users,
  title,
  canRename,
  isEditing,
  draftTitle,
  isRenaming,
  renameError,
  snapshotTitle,
  onStartEditing,
  onDraftTitleChange,
  onSaveTitle,
  onCancelEditing,
  onSnapshotTitleChange,
  onSaveSnapshot,
  disabled,
}: DocumentNavbarViewProps) {
  return (
    <header className="relative z-20 border-b border-white/15 bg-[oklch(0.12_0.006_285)] font-mono text-[#f4f2ee]">
      <nav
        aria-label="Document navigation"
        className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          {!isEditing ? (
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="inline-flex size-10 items-center justify-center border border-white/15 text-xs text-[#f4f2ee] transition-colors hover:border-white/45 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto sm:gap-2 sm:px-3"
            >
              <ArrowLeft aria-hidden="true" size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          ) : null}

          <span className="hidden text-sm tracking-[-0.04em] text-white/55 lg:inline">
            SyncText<span className="text-[#8984b5]">↗</span>
          </span>
        </div>

        <div className="min-w-0 sm:px-3">
          {isEditing ? (
            <form
              className="mx-auto flex max-w-xl items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                onSaveTitle()
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  onCancelEditing()
                }
              }}
            >
              <input
                autoFocus
                value={draftTitle}
                maxLength={120}
                disabled={isRenaming}
                aria-label="Document title"
                aria-describedby={renameError ? "document-rename-error" : undefined}
                onChange={(event) => onDraftTitleChange(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    onCancelEditing()
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
              disabled={!canRename || disabled}
              onClick={onStartEditing}
              className="mx-auto flex min-h-10 max-w-xl items-center gap-2 px-3 text-left text-sm tracking-tight text-white transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
              title={canRename ? "Rename document" : "You have view-only access"}
            >
              <span className="sm:hidden">{truncateTitle(title, 15)}</span>
              <span className="hidden sm:inline">{truncateTitle(title, 50)}</span>
              {canRename ? <Pencil aria-hidden="true" className="shrink-0 text-white/45" size={14} /> : null}
            </button>
          )}
          {renameError ? (
            <p id="document-rename-error" role="alert" className="mt-1 text-center text-[11px] text-red-300">
              {renameError}
            </p>
          ) : null}
        </div>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
          {!isEditing ? (
            <span
              className="inline-flex size-10 items-center justify-center border border-white/15 text-[11px] text-white/65 sm:w-auto sm:gap-2 sm:px-2.5 sm:py-2"
              aria-label={`Connection status: ${status}`}
              title={status}
            >
              <span className={`size-2 rounded-full ${STATUS_COLOR[status]}`} aria-hidden="true" />
              <span className="hidden sm:inline">{status}</span>
            </span>
          ) : null}

          <div className="flex min-w-0 -space-x-1" aria-label={`${users.length} online`}>
            {users.slice(0, 4).map((onlineUser) => {
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
            {users.length > 4 ? (
              <span
                className="inline-flex size-8 items-center justify-center rounded-full border-2 border-[oklch(0.12_0.006_285)] bg-zinc-700 text-[10px] font-semibold text-white"
                title={`${users.length - 4} more online`}
              >
                +{users.length - 4}
              </span>
            ) : null}
          </div>

          <form
            className="hidden items-center sm:flex"
            onSubmit={(event) => {
              event.preventDefault()
              onSaveSnapshot()
            }}
          >
            <input
              value={snapshotTitle}
              onChange={(event) => onSnapshotTitleChange(event.target.value)}
              placeholder="Snapshot title"
              aria-label="Snapshot title"
              disabled={disabled}
              className="min-h-10 w-36 border border-white/15 bg-transparent px-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/40"
            />
            <button
              type="submit"
              disabled={disabled || !snapshotTitle.trim()}
              className="min-h-10 border border-l-0 border-white/15 px-3 text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              Save
            </button>
          </form>
        </div>
      </nav>
    </header>
  )
}

type DocumentNavbarProps = {
  docId: string
  initialTitle: string
  canRename: boolean
}

export function DocumentNavbar({ docId, initialTitle, canRename }: DocumentNavbarProps) {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()
  const [title, setTitle] = useState(initialTitle)
  const [draftTitle, setDraftTitle] = useState(initialTitle)
  const [isEditing, setIsEditing] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState("")
  const [snapshotTitle, setSnapshotTitle] = useState("")

  function cancelEditing() {
    setDraftTitle(title)
    setRenameError("")
    setIsEditing(false)
  }

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
    <DocumentNavbarView
      status={status}
      users={users}
      title={title}
      canRename={canRename}
      isEditing={isEditing}
      draftTitle={draftTitle}
      isRenaming={isRenaming}
      renameError={renameError}
      snapshotTitle={snapshotTitle}
      onStartEditing={() => setIsEditing(true)}
      onDraftTitleChange={setDraftTitle}
      onSaveTitle={() => void saveTitle()}
      onCancelEditing={cancelEditing}
      onSnapshotTitleChange={setSnapshotTitle}
      onSaveSnapshot={saveSnapshot}
    />
  )
}
