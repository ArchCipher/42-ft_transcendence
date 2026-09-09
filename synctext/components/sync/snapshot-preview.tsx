"use client"

import { useEffect, useMemo, useState } from "react"
import { useEditor } from "@tiptap/react"
import Collaboration from "@tiptap/extension-collaboration"
import * as Y from "yjs"

import {
  SimpleEditorView,
  baseTiptapExtensions,
  simpleEditorConfig,
} from "@/components/tiptap-templates/simple/simple-editor-view"

type SnapshotPreviewProps = {
  docId: string
  snapshotId: string
}

function HistoricalEditor({ state }: { state: Uint8Array }) {
  const document = useMemo(() => {
    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, state)
    return ydoc
  }, [state])

  const editor = useEditor(
    {
      ...simpleEditorConfig,
      editable: false,
      extensions: [
        ...baseTiptapExtensions({ undoRedo: false }),
        Collaboration.configure({ document }),
      ],
    },
    [document],
  )

  useEffect(() => {
    return () => document.destroy()
  }, [document])

  return <SimpleEditorView editor={editor} showToolbar={false} />
}

function SnapshotPreviewContent({ docId, snapshotId }: SnapshotPreviewProps) {
  const [state, setState] = useState<Uint8Array | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadSnapshot() {
      try {
        const response = await fetch(
          `/api/documents/${encodeURIComponent(docId)}/snapshots/${encodeURIComponent(snapshotId)}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error("Could not load snapshot")
        }

        setState(new Uint8Array(await response.arrayBuffer()))
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return
        }
        setError("Could not load snapshot")
      }
    }

    void loadSnapshot()

    return () => controller.abort()
  }, [docId, snapshotId])

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (!state) {
    return <p>Loading snapshot...</p>
  }

  return <HistoricalEditor state={state} />
}

export function SnapshotPreview({ docId, snapshotId }: SnapshotPreviewProps) {
  return (
    <SnapshotPreviewContent
      key={JSON.stringify([docId, snapshotId])}
      docId={docId}
      snapshotId={snapshotId}
    />
  )
}
