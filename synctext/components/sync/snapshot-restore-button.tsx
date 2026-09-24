"use client"

import { useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const UNCONFIRMED_RESTORE =
  "Could not confirm the restore. Close history and check the live document before trying again."

async function restoreSnapshot(docId: string, snapshotId: string): Promise<string> {
  const response = await fetch(
    `/api/documents/${encodeURIComponent(docId)}/snapshots/${encodeURIComponent(snapshotId)}/restore`,
    {
      method: "POST",
      // allow the server's restore request to finish before timing out here
      signal: AbortSignal.timeout(65000),
    },
  )

  if (response.status === 401) {
    throw new Error("Your session expired. Sign in again before restoring.")
  }
  if (response.status === 403) {
    throw new Error("You no longer have permission to restore this document.")
  }
  if (response.status === 404) {
    throw new Error("This snapshot is unavailable, or your access changed. Close this message and refresh history.")
  }
  if (response.status === 422) {
    throw new Error("This snapshot could not be restored. Close this message and choose another snapshot.")
  }
  if (!response.ok) {
    throw new Error(UNCONFIRMED_RESTORE)
  }

  const result = await response.json()
  if (result.ok !== true || typeof result.recoverySnapshotId !== "string") {
    throw new Error(UNCONFIRMED_RESTORE)
  }
  return result.recoverySnapshotId
}

type SnapshotRestoreButtonProps = {
  docId: string
  snapshotId: string
  snapshotTime: string
  disabled: boolean
  isRestoring: boolean
  onRestoringChange: (isRestoring: boolean) => void
  onRestored: (recoverySnapshotId: string) => void
}

export function SnapshotRestoreButton({
  docId,
  snapshotId,
  snapshotTime,
  disabled,
  isRestoring,
  onRestoringChange,
  onRestored,
}: SnapshotRestoreButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")

  async function handleRestore() {
    if (disabled || isRestoring || error) return

    onRestoringChange(true)
    try {
      const recoverySnapshotId = await restoreSnapshot(docId, snapshotId)
      setIsOpen(false)
      onRestored(recoverySnapshotId)
    } catch (restoreError) {
      // losing the response does not mean the server stopped the restore
      if (restoreError instanceof Error && restoreError.name === "Error") {
        setError(restoreError.message)
      } else {
        setError(UNCONFIRMED_RESTORE)
      }
    } finally {
      onRestoringChange(false)
    }
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open, details) => {
        // keep the result visible and prevent another restore while this one runs
        if (isRestoring) {
          details.cancel()
          return
        }
        setIsOpen(open)
        if (open) setError("")
      }}
    >
      <AlertDialogTrigger
        disabled={disabled || isRestoring}
        render={<Button variant="outline" />}
      >
        <RotateCcw aria-hidden="true" />
        Restore snapshot
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this snapshot?</AlertDialogTitle>
          <AlertDialogDescription>
            Replace the document content with the snapshot from {snapshotTime} for everyone
            editing it. A recovery copy of the current content will be saved first.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {isRestoring && (
          <p role="status" className="text-sm text-muted-foreground">Restoring snapshot...</p>
        )}
        {disabled && !isRestoring && (
          <p role="status" className="text-sm text-muted-foreground">
            Restore is unavailable right now. Check your connection and preview before continuing.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>
            {error ? "Close" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled || isRestoring || Boolean(error)}
            onClick={handleRestore}
          >
            {isRestoring && <Loader2 aria-hidden="true" className="animate-spin" />}
            {isRestoring ? "Restoring..." : "Restore for everyone"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
