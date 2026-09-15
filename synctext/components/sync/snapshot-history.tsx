"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { History, RefreshCw, X } from "lucide-react"

import { SnapshotPreview } from "@/components/sync/snapshot-preview"
import "@/components/sync/snapshot-history.css"

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
  onSelectSnapshot: (snapshotId: string) => void
}

function SnapshotList({ snapshots, selectedId, onSelectSnapshot }: SnapshotListProps) {
  return (
    <aside className="max-h-40 overflow-y-auto border-b border-border p-3 md:max-h-none md:border-r md:border-b-0">
      <ul aria-label="Saved snapshots" className="space-y-2">
        {snapshots.map((snapshot, index) => (
          <li key={snapshot.id}>
            <button
              type="button"
              aria-pressed={snapshot.id === selectedId}
              onClick={() => onSelectSnapshot(snapshot.id)}
              className="w-full border border-border px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-muted"
            >
              <time dateTime={snapshot.createdAt}>{formatSnapshotTime(snapshot.createdAt)}</time>
              {index === 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">Latest saved snapshot</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

type SnapshotPreviewPanelProps = {
  docId: string
  snapshot: SnapshotSummary | undefined
}

function SnapshotPreviewPanel({ docId, snapshot }: SnapshotPreviewPanelProps) {
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
        <SnapshotPreview docId={docId} snapshotId={snapshot.id} />
      </div>
    </section>
  )
}

function SnapshotHistoryContent({ docId }: { docId: string }) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSnapshots() {
      try {
        const loadedSnapshots = await fetchSnapshots(docId, controller.signal)
        if (controller.signal.aborted) return

        setSnapshots(loadedSnapshots)

        // select the newest snapshot by default
        if (loadedSnapshots.length > 0) {
          setSelectedId(loadedSnapshots[0].id)
        } else {
          setSelectedId(null)
        }
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

  function refreshHistory() {
    setIsLoading(true)
    setError("")
    setSnapshots([])
    setSelectedId(null)
    setReloadCount((count) => count + 1)
  }

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === selectedId)

  function renderHistory() {
    if (isLoading) {
      return (
        <p role="status" className="p-6 text-sm text-muted-foreground">Loading snapshot history...</p>
      )
    }

    if (error) {
      return <p role="alert" className="p-6 text-sm text-destructive">{error}</p>
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
          onSelectSnapshot={setSelectedId}
        />
        <SnapshotPreviewPanel docId={docId} snapshot={selectedSnapshot} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">Times are local.</p>
        <button
          type="button"
          onClick={refreshHistory}
          disabled={isLoading}
          className="inline-flex min-h-9 items-center gap-2 px-2 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" size={14} />
          {error ? "Try again" : "Refresh history"}
        </button>
      </div>

      {renderHistory()}
    </div>
  )
}

// mount content only while open to fetch fresh history and release the preview on close
export function SnapshotHistory({ docId }: { docId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger
        aria-label="Snapshot history"
        title="Snapshot history"
        className="inline-flex size-10 shrink-0 items-center justify-center border border-white/15 text-xs text-[#f4f2ee] transition-colors hover:border-white/45 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto sm:gap-2 sm:px-3"
      >
        <History aria-hidden="true" size={15} />
        <span className="hidden sm:inline">History</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[calc(100dvh-1rem)] max-h-[52rem] w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-border bg-background text-foreground shadow-2xl outline-none sm:h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4">
            <div>
              <Dialog.Title className="font-mono text-lg">Snapshot history</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                View the latest five saved snapshots of this document.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close snapshot history"
              className="inline-flex size-10 shrink-0 items-center justify-center border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" size={18} />
            </Dialog.Close>
          </div>

          {isOpen && <SnapshotHistoryContent docId={docId} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
