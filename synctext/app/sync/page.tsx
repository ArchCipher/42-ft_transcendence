"use client"

import dynamic from "next/dynamic"

// Rendered client-only: SyncEditorPage reads window.location to build the
// collab websocket URL, which doesn't exist during SSR. { ssr: false } skips
// server rendering for it entirely, so there's nothing for the client's
// first render to mismatch against.
const SyncEditorPage = dynamic(
  () => import("@/components/sync/sync-editor").then((mod) => mod.SyncEditorPage),
  { ssr: false }
)

export default function Page() {
  return <SyncEditorPage />
}
