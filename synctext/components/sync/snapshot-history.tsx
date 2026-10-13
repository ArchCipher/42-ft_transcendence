"use client"

import { useEffect, useRef, useState } from "react"
import { History, RefreshCw, X } from "lucide-react"

import { SnapshotPreview } from "@/components/sync/snapshot-preview"
import { SnapshotRestoreButton } from "@/components/sync/snapshot-restore-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import "@/components/sync/snapshot-history.css"
import ErrorNote from "@/app/components/form/ErrorNote"
import buttonStyles from "@/app/components/ui/Button.module.css"
import { TechText } from "@/app/components/typography/Typography"

type SnapshotSummary = {
  id: string
  createdAt: string
}

function formatSnapshotTime(createdAt: string) {
  return new Date(createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

async function fetchSnapshots(docId: string, signal: AbortSignal): Promise<SnapshotSummary[]> {
  // preview fetches its own binary, so this request only loads metadata
  const response = await fetch(
    `/api/documents/${encodeURIComponent(docId)}/snapshots`,
    { signal, cache: "no-store" },
  )

  if (response.status === 401) {
    throw new Error("Your session expired. Sign in again to view snapshots.")
  }

  if (response.status === 404) {
    throw new Error("This document is unavailable, or you no longer have access.")
  }

  if (!response.ok) {
    throw new Error("Could not load snapshot history. Try again.")
  }

  return response.json()
}

type SnapshotListProps = {
  snapshots: SnapshotSummary[]
  selectedId: string | null
  recoverySnapshotId: string | null
  disabled: boolean
  onSelectSnapshot: (snapshotId: string) => void
}

function SnapshotList({
  snapshots,
  selectedId,
  recoverySnapshotId,
  disabled,
  onSelectSnapshot,
}: SnapshotListProps) {
  return (
    <aside className="max-h-40 overflow-y-auto border-b border-border p-3 md:max-h-none md:border-r md:border-b-0">
      <ul aria-label="Saved snapshots" className="space-y-2">
        {snapshots.map((snapshot, index) => (
          <li key={snapshot.id}>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-pressed={snapshot.id === selectedId}
              onClick={() => onSelectSnapshot(snapshot.id)}
              className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left aria-pressed:border-primary aria-pressed:bg-muted"
            >
              <time dateTime={snapshot.createdAt}>{formatSnapshotTime(snapshot.createdAt)}</time>
              {snapshot.id === recoverySnapshotId && (
                <span className="text-xs text-muted-foreground">Recovery copy before restore</span>
              )}
              {index === 0 && snapshot.id !== recoverySnapshotId && (
                <span className="text-xs text-muted-foreground">Latest saved snapshot</span>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

type SnapshotPreviewPanelProps = {
  docId: string
  snapshot: SnapshotSummary | undefined
  onPreviewReady: (snapshotId: string) => void
}

function SnapshotPreviewPanel({ docId, snapshot, onPreviewReady }: SnapshotPreviewPanelProps) {
  if (!snapshot) {
    return null
  }

  return (
    <section aria-label="Read-only snapshot preview" className="flex min-h-0 min-w-0 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3 text-sm">
        <p className="font-medium">Read-only preview</p>
        <time dateTime={snapshot.createdAt} className="text-xs text-muted-foreground">
          {formatSnapshotTime(snapshot.createdAt)}
        </time>
      </div>
      <div
        role="region"
        aria-label="Snapshot content"
        tabIndex={0}
        className="snapshot-history-preview min-h-0 flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <SnapshotPreview docId={docId} snapshotId={snapshot.id} onReady={onPreviewReady} />
      </div>
    </section>
  )
}

type SnapshotHistoryProps = {
  docId: string
  canRestore: boolean
  isConnected: boolean
}

type SnapshotHistoryContentProps = SnapshotHistoryProps & {
  isRestoring: boolean
  onRestoringChange: (isRestoring: boolean) => void
}

function SnapshotHistoryContent({
  docId,
  canRestore,
  isConnected,
  isRestoring,
  onRestoringChange,
}: SnapshotHistoryContentProps) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadCount, setReloadCount] = useState(0)
  const [readySnapshotId, setReadySnapshotId] = useState<string | null>(null)
  const [recoverySnapshotId, setRecoverySnapshotId] = useState<string | null>(null)
  const [success, setSuccess] = useState("")
  const successMessageRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    // refresh replaces the restore button, so return focus to the result instead
    if (success && !isLoading) successMessageRef.current?.focus()
  }, [success, isLoading])

  useEffect(() => {
    const controller = new AbortController()

    async function loadSnapshots() {
      try {
        const loadedSnapshots = await fetchSnapshots(docId, controller.signal)
        if (controller.signal.aborted) return

        setSnapshots(loadedSnapshots)

        // keep the restored snapshot selected if retention has not removed it
        setSelectedId((currentId) => {
          if (loadedSnapshots.some((snapshot) => snapshot.id === currentId)) return currentId
          return loadedSnapshots[0]?.id ?? null
        })
      } catch (loadError) {
        if (controller.signal.aborted) return

        if (loadError instanceof Error) {
          setError(loadError.message)
        } else {
          setError("Could not load snapshot history. Try again.")
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadSnapshots()

    // prevent obsolete requests from updating state
    return () => controller.abort()
  }, [docId, reloadCount])

  function refreshHistory(preferredSnapshotId: string | null = null) {
    setIsLoading(true)
    setError("")
    setSnapshots([])
    setSelectedId(preferredSnapshotId)
    setReadySnapshotId(null)
    setReloadCount((count) => count + 1)
  }

  function selectSnapshot(snapshotId: string) {
    if (snapshotId === selectedId) return
    setReadySnapshotId(null)
    setSelectedId(snapshotId)
  }

  function handleRestored(recoveryId: string) {
    setRecoverySnapshotId(recoveryId)
    setSuccess("Snapshot restored. A recovery copy was saved before the restore.")
    refreshHistory(selectedId)
  }

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === selectedId)
  let restoreHint = "Restoring replaces the document content for everyone."
  if (!canRestore) {
    restoreHint = "You can preview snapshots. Restoring requires edit access."
  } else if (!isConnected) {
    restoreHint = "Reconnect to the document before restoring."
  }

  function renderHistory() {
    if (isLoading) {
      return (
        <p role="status" className="p-6 text-sm text-muted-foreground">Loading snapshot history...</p>
      )
    }

    if (error) {
      return <div className="p-6"><ErrorNote>{error}</ErrorNote></div>
    }

    if (snapshots.length === 0) {
      return (
        <div role="status" className="p-6 text-sm">
          <p>No snapshots yet.</p>
          <p className="mt-2 text-muted-foreground">
            Snapshots appear as changes are saved. Check again after editing the document.
          </p>
        </div>
      )
    }

    return (
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-1">
        <SnapshotList
          snapshots={snapshots}
          selectedId={selectedId}
          recoverySnapshotId={recoverySnapshotId}
          disabled={isRestoring}
          onSelectSnapshot={selectSnapshot}
        />
        <SnapshotPreviewPanel
          docId={docId}
          snapshot={selectedSnapshot}
          onPreviewReady={setReadySnapshotId}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="text-muted-foreground">Times are local.</p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => refreshHistory()}
          disabled={isLoading || isRestoring}
        >
          <RefreshCw aria-hidden="true" size={14} />
          {error ? "Try again" : "Refresh history"}
        </Button>
      </div>

      {success && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-4 py-3">
          <p ref={successMessageRef} role="status" tabIndex={-1} className="text-sm outline-none">
            {success}
          </p>
          <DialogClose disabled={isRestoring} render={<Button variant="outline" />}>
            Back to document
          </DialogClose>
        </div>
      )}

      {renderHistory()}

      {!isLoading && !error && selectedSnapshot && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{restoreHint}</p>
          {canRestore && (
            <SnapshotRestoreButton
              key={selectedSnapshot.id}
              docId={docId}
              snapshotId={selectedSnapshot.id}
              snapshotTime={formatSnapshotTime(selectedSnapshot.createdAt)}
              disabled={!isConnected || readySnapshotId !== selectedSnapshot.id}
              isRestoring={isRestoring}
              onRestoringChange={onRestoringChange}
              onRestored={handleRestored}
            />
          )}
        </div>
      )}
    </div>
  )
}

// mount content only while open to fetch fresh history and release the preview on close
export function SnapshotHistory({ docId, canRestore, isConnected }: SnapshotHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open, details) => {
        if (isRestoring) {
          details.cancel()
          return
        }
        setIsOpen(open)
      }}
    >
      <DialogTrigger
        aria-label="Snapshot history"
        title="Snapshot history"
        className={[buttonStyles.button, buttonStyles.outline].filter(Boolean).join(" ")}
      >
        <History aria-hidden="true" size={15} />
        <TechText className="text-base max-[900px]:text-[0.7rem]">History</TechText>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="SnapshotHistoryDialog flex h-[min(660px,calc(100dvh-64px))] max-w-[min(940px,calc(100vw-48px))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1080px,calc(100vw-64px))]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4">
          <DialogHeader>
            <DialogTitle>Snapshot history</DialogTitle>
            <DialogDescription>
              View the latest five saved snapshots of this document.
            </DialogDescription>
          </DialogHeader>
          <DialogClose
            aria-label="Close snapshot history"
            disabled={isRestoring}
            render={<Button variant="ghost" size="icon" />}
          >
            <X aria-hidden="true" size={18} />
          </DialogClose>
        </div>

        {isOpen && (
          <SnapshotHistoryContent
            docId={docId}
            canRestore={canRestore}
            isConnected={isConnected}
            isRestoring={isRestoring}
            onRestoringChange={setIsRestoring}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
