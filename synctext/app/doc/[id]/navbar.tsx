"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Check, Pencil } from "lucide-react"

import type { HocuspocusProvider } from "@hocuspocus/provider"
import type { CollabUser, ConnectionStatus } from "@hocuspocus/provider-react"
import { renameDocument_api } from "@/app/dashboard/document/document"
import { TechText } from "@/app/components/typography/Typography"
import Button from "@/app/components/ui/Button"
import Box from "@/app/components/form/Box"
import { SnapshotHistory } from "@/components/sync/snapshot-history"

import styles from "./navbar.module.css"

type SyncUser = { name: string; color: string }

type DocumentNavbarProps = {
  docId: string
  initialTitle: string
  canRename: boolean
  provider: HocuspocusProvider | null
  status: ConnectionStatus
  users: CollabUser[]
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
  provider,
  status,
  users,
}: DocumentNavbarProps) {
  const [title, setTitle] = useState(initialTitle)
  const [draftTitle, setDraftTitle] = useState(initialTitle)
  const [isEditing, setIsEditing] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState("")

  // Broadcast only: the map is observed but never read at mount, because
  // Postgres is the source of truth and a rename from the dashboard never
  // touches Yjs — a title stored here can be older than the database.
  useEffect(() => {
    if (!provider) return
    const meta = provider.document.getMap<string>("meta")
    const onMetaChange = () => {
      const nextTitle = meta.get("title")
      if (nextTitle) setTitle(nextTitle)
    }
    meta.observe(onMetaChange)
    return () => meta.unobserve(onMetaChange)
  }, [provider])

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
      provider?.document.getMap<string>("meta").set("title", renamedDocument.title)
    } catch {
      setRenameError("Could not rename document")
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <header
      className={`relative z-20 border-b border-white/15 text-[#f4f2ee] ${styles.editorNavbar}`}
    >
      <nav
        aria-label="Document navigation"
        className="relative grid min-h-16
           grid-cols-[auto_minmax(0,1fr)_auto]
           items-center gap-x-1
           px-2 py-2
           min-[901px]:min-h-16
           min-[901px]:grid-cols-[auto_minmax(0,1fr)_auto]
           min-[901px]:gap-3
           min-[901px]:px-6
           min-[901px]:py-2">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center
                        min-[901px]:col-auto min-[901px]:row-auto min-[901px]:gap-5">
          {!isEditing ? (
            <>
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className="inline-flex size-11 items-center justify-center border border-[#6fd3ff]/30 bg-[#101b30] text-[#f4f2ee] transition-colors hover:border-[#6fd3ff] hover:bg-[#152744] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6fd3ff] min-[901px]:hidden"
              >
                <ArrowLeft aria-hidden="true" size={18} />
              </Link>
              <div className="hidden min-[901px]:block">
                <Link
                  href="/"
                  aria-label="SyncText home"
                  className="mr-5 font-serif text-2xl text-[#f4f2ee] no-underline"
                >
                  SyncText
                </Link>
              <Button href="/dashboard" compact>
                Dashboard
              </Button>
              </div>
            </>
          ) : null}
        </div>

        <div className="absolute left-1/2 row-start-1 w-[min(42vw,20rem)] min-w-0 -translate-x-1/2
                min-[901px]:col-span-1
                min-[901px]:static min-[901px]:w-auto min-[901px]:translate-x-0
                min-[901px]:row-auto
                min-[901px]:px-3">
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
                  maxLength={50}
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
              onClick={() => {
                setDraftTitle(title)
                setIsEditing(true)
              }}
              className="mx-auto flex min-h-10 max-w-xl items-center gap-2
              px-3 text-left text-sm tracking-tight text-white
              transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent
                          max-[900px]:mx-0
                          max-[900px]:w-full
                          max-[900px]:max-w-none
                          max-[900px]:justify-center
                          max-[900px]:px-1"
              title={canRename ? "Rename document" : "You have view-only access"}
            >
              <span className="min-[901px]:hidden">
                <span className="block truncate font-mono text-base tracking-tight text-white">
                  {truncateTitle(title, 22)}
                </span>
              </span>

              <span className="hidden min-[901px]:inline">
                <span className="font-mono text-base tracking-tight text-white">
                  {truncateTitle(title, 50)}
                </span>
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

          <div className="col-start-3 row-start-1 ml-auto flex min-w-0 items-center justify-end gap-1
                min-[901px]:col-auto
                min-[901px]:row-auto min-[901px]:gap-2">
          <SnapshotHistory key={docId} docId={docId} />

          {!isEditing ? (
            <span
              className="inline-flex min-h-11 items-center
                        justify-center border border-[#6fd3ff]/30
                        bg-[#101b30] px-3 text-white/70 sm:gap-2
                        max-[900px]:min-h-0
                        max-[900px]:border-0
                        max-[900px]:bg-transparent
                        max-[900px]:p-0"
              aria-label={`Connection status: ${status}`}
              title={status}
            >
              <span className={`size-2 rounded-full ${STATUS_COLOR[status]}`} aria-hidden="true" />
              <TechText className="text-sm normal-case max-[900px]:hidden">
                {status}
              </TechText>
            </span>
          ) : null}

          <div
            className="flex min-w-0 -space-x-1"
            aria-label={`${users.length} other${users.length === 1 ? "" : "s"} online`}
          >
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

        </div>
      </nav>
    </header>
  )
}
