"use client"

import { useEffect, useState } from "react"
import { EditorContent, useEditor, type AnyExtension } from "@tiptap/react"
import Collaboration from "@tiptap/extension-collaboration"
import * as Y from "yjs"

import {
  baseTiptapExtensions,
  simpleEditorConfig,
} from "@/components/tiptap-templates/simple/simple-editor-view"
import ErrorNote from "@/app/components/form/ErrorNote"

type SnapshotPreviewProps = {
  docId: string
  snapshotId: string
  onReady?: (snapshotId: string) => void
}

async function fetchSnapshotBytes(
  docId: string,
  snapshotId: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(
    `/api/documents/${encodeURIComponent(docId)}/snapshots/${encodeURIComponent(snapshotId)}`,
    { signal, cache: "no-store" },
  )

  if (response.status === 401) {
    throw new Error("Your session expired. Sign in again to view snapshots.")
  }

  if (response.status === 404) {
    throw new Error("This snapshot is unavailable. Refresh history to check the latest snapshots.")
  }

  if (!response.ok) {
    throw new Error("Could not load snapshot. Refresh history to try again.")
  }

  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

function createSnapshotDocument(bytes: Uint8Array): Y.Doc {
  // a separate document keeps the preview from changing the live room
  const snapshotDocument = new Y.Doc()

  try {
    Y.applyUpdate(snapshotDocument, bytes)
  } catch {
    // a failed update can still leave a partly filled document
    snapshotDocument.destroy()
    throw new Error("Could not read this snapshot. Refresh history or choose another snapshot.")
  }

  return snapshotDocument
}

type SnapshotEditorProps = {
  snapshotDocument: Y.Doc
}

function SnapshotEditor({ snapshotDocument }: SnapshotEditorProps) {
  const editor = useEditor(
    {
      ...simpleEditorConfig,
      editable: false,
      editorProps: {
        ...simpleEditorConfig.editorProps,
        attributes: {
          ...simpleEditorConfig.editorProps.attributes,
          role: "textbox",
          "aria-label": "Snapshot content (read-only)",
          "aria-multiline": "true",
          "aria-readonly": "true",
        },
      },
      extensions: [
        ...baseTiptapExtensions({ undoRedo: false }),
        Collaboration.configure({ document: snapshotDocument }),
      ] as AnyExtension[],
    },
    [snapshotDocument],
  )

  // reuse the content styles without adding another toolbar or search shortcut
  return (
    <div className="simple-editor-wrapper">
      <EditorContent editor={editor} className="simple-editor-content" />
    </div>
  )
}

function SnapshotPreviewContent({ docId, snapshotId, onReady }: SnapshotPreviewProps) {
  const [snapshotDocument, setSnapshotDocument] = useState<Y.Doc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    let temporaryDocument: Y.Doc | null = null

    async function loadSnapshot() {
      try {
        const bytes = await fetchSnapshotBytes(docId, snapshotId, controller.signal)
        if (controller.signal.aborted) return

        temporaryDocument = createSnapshotDocument(bytes)
        setSnapshotDocument(temporaryDocument)
        onReady?.(snapshotId)
      } catch (loadError) {
        if (controller.signal.aborted) return

        if (loadError instanceof Error) {
          setError(loadError.message)
        } else {
          setError("Could not load snapshot. Refresh history to try again.")
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadSnapshot()

    // release the temporary document when this preview is replaced or closed
    return () => {
      controller.abort()
      if (temporaryDocument) {
        temporaryDocument.destroy()
      }
    }
  }, [docId, snapshotId, onReady])

  if (isLoading) {
    return <p role="status">Loading snapshot...</p>
  }

  if (error) {
    return <ErrorNote>{error}</ErrorNote>
  }

  if (!snapshotDocument) {
    return null
  }

  return <SnapshotEditor snapshotDocument={snapshotDocument} />
}

// remount for a new selection so previous content and errors are cleared
export function SnapshotPreview({ docId, snapshotId, onReady }: SnapshotPreviewProps) {
  return (
    <SnapshotPreviewContent
      key={snapshotId}
      docId={docId}
      snapshotId={snapshotId}
      onReady={onReady}
    />
  )
}
