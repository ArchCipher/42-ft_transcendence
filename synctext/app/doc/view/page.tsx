import { SyncEditorPage } from "@/components/sync/sync-editor"

// Reachable only via the internal rewrite in proxy.ts, which already
// confirmed access for this visitor before landing here.
//
// No [id] segment on purpose: every document renders the exact same HTML
// here (content and metadata are entirely client-side), so this is one
// universal static page shared by every document, not one cache entry per
// id. The client recovers which document to open from the browser's own
// URL — see sync-editor.tsx.
export default function DocViewPage() {
  return <SyncEditorPage mode="view" />
}
