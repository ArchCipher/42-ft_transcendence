// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client"

import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
} from "@hocuspocus/provider-react"

import { SyncEditorSession } from "@/components/sync/sync-editor-session"

// nginx proxies /collab to the hocuspocus server on the same origin as the
// page, so this must stay same-host (see connect-src 'self' in next.config.ts)
// rather than pointing at the "collab" docker service name or a fixed port.
// Safe to call directly (no window-availability guard needed): this
// component is only ever mounted client-side, via next/dynamic's
// { ssr: false } in app/sync/page.tsx.
function getCollabUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${window.location.host}/collab`
}

export function SyncEditorPage() {
  return (
    <HocuspocusProviderWebsocketComponent url={getCollabUrl()}>
      <HocuspocusRoom name="example-document">
        <SyncEditorSession />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}
