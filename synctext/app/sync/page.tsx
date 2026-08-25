"use client"

import dynamic from "next/dynamic"

// SyncEditorPage uses window.location to build the WebSocket URL ==> {ssr:false}
const SyncEditorPage = dynamic(
  () => import("@/components/sync/sync-editor").then((mod) => mod.SyncEditorPage),
  { ssr: false }
)

export default function Page() {
  return <SyncEditorPage />
}
