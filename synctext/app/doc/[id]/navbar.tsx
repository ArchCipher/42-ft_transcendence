"use client"

import Link from "next/link"
import { useState } from "react"
import type { CollabUser } from "@hocuspocus/provider-react"
import { useHocuspocusAwareness, useHocuspocusConnectionStatus, useHocuspocusProvider } from "@hocuspocus/provider-react"
import Button from "@/components/Button"
import { Check, Pencil } from "lucide-react"
import { renameDocument_api } from "@/app/dashboard/document/document"
import { requestSnapshot } from "@/lib/sync/sync-snapshot"
import styles from "./navbar.module.css"
import Box from "@/components/Box"
import { DisplayText, TechText } from "@/components/Typography"

type SyncUser = { name: string; color: string }

type DocumentNavbarProps = {
  docId: string
  initialTitle: string
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

function truncateTitle(title: string, limit: number) {
  return title.length > limit ? `${title.slice(0, limit)}...` : title
}

export function DocumentNavbar({
  docId,
  initialTitle,
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
    <header
      className={`relative z-20 border-b border-white/15 text-[#f4f2ee] ${styles.editorNavbar}`}
    >
      <nav
        aria-label="Document navigation"
        className="grid min-h-16
                    grid-cols-1
                    items-center gap-2
                    px-3 py-2
                    min-[901px]:grid-cols-[auto_minmax(0,1fr)_auto]
                    min-[901px]:gap-3
                    min-[901px]:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            aria-label="SyncText home"
            className="text-[#f4f2ee] no-underline"
          >
            <DisplayText className="text-2xl">
              SyncText
            </DisplayText>
          </Link>

          {!isEditing ? (
            <Button href="/dashboard" compact>
              Dashboard
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 sm:px-3">
          {isEditing ? (
            <form
              className="mx-auto flex max-w-xl items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void saveTitle()
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  cancelEditing()
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <Box
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
                      cancelEditing()
                    }
                  }}
                />
              </div>
              <Button
                type="submit"
                compact
                disabled={isRenaming || !draftTitle.trim()}
                aria-label="Save document title"
              >
                <Check aria-hidden="true" size={16} />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              disabled={!canRename}
              onClick={() => setIsEditing(true)}
              className="mx-auto flex min-h-10 max-w-xl items-center gap-2 px-3 text-left text-white transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
              title={canRename ? "Rename document" : "You have view-only access"}
            >
              <span className="sm:hidden">
                <TechText className="text-sm normal-case">
                  {truncateTitle(title, 15)}
                </TechText>
              </span>

              <span className="hidden sm:inline">
                <TechText className="text-sm normal-case">
                  {truncateTitle(title, 50)}
                </TechText>
              </span>
              {canRename ? <Pencil aria-hidden="true" className="shrink-0 text-white/45" size={14} /> : null}
            </button>
          )}
          {renameError ? (
            <p id="document-rename-error" role="alert" className="mt-1 text-center text-[11px] text-red-300">
              {renameError}
            </p>
          ) : null}
        </div>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2
                        max-[900px]:ml-0
                        max-[900px]:w-full
                        max-[900px]:flex-wrap
                        max-[900px]:justify-start">
          {!isEditing ? (
            <span
              className="inline-flex min-h-11 items-center
                        justify-center border border-[#6fd3ff]/30
                        bg-[#101b30] px-3 text-white/70 sm:gap-2"
              aria-label={`Connection status: ${status}`}
              title={status}
            >
              <span className={`size-2 rounded-full ${STATUS_COLOR[status]}`} aria-hidden="true" />
              <TechText className="text-sm normal-case">
                {status}
              </TechText>
            </span>
          ) : null}

          <div className="flex min-w-0 -space-x-1" aria-label={`${users.length} online`}>
            {users.slice(0, 4).map((onlineUser) => {
              const identity = collaboratorIdentity(onlineUser)
              return (
                <span
                  key={onlineUser.clientId}
                  title={identity.name}
                  className="inline-flex size-8
                            items-center justify-center rounded-full
                            border-2 border-[oklch(0.12_0.006_285)] text-xs font-semibold text-white"
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
            className="flex w-full items-center gap-2 min-[901px]:w-auto"
            onSubmit={(event) => {
              event.preventDefault()
              saveSnapshot()
            }}
          >
            <div className="min-w-0 flex-1 min-[901px]:w-40 min-[901px]:flex-none">
              <Box
                value={snapshotTitle}
                onChange={(event) => setSnapshotTitle(event.target.value)}
                placeholder="Snapshot title"
                aria-label="Snapshot title"
              />
          </div>
          <Button
            type="submit"
            variant="outline"
            compact
            disabled={!snapshotTitle.trim()}>
            Save
          </Button>
          </form>
        </div>
      </nav>
    </header>
  )
}
