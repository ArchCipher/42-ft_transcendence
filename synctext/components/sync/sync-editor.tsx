// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client"

import { useSyncExternalStore } from "react"
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
} from "@hocuspocus/provider-react"

import { SyncEditorSession } from "@/components/sync/sync-editor-session"

// nginx proxies /collab to the hocuspocus server on the same origin as the
// page, so this must stay same-host (see connect-src 'self' in next.config.ts)
// rather than pointing at the "collab" docker service name or a fixed port.
function getCollabUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${window.location.host}/collab`
}

// getCollabUrl() reads window.location, which doesn't exist during SSR.
// useSyncExternalStore renders the server snapshot (null) on the server and
// on the client's first hydration pass, then swaps to the real URL right
// after — the standard way to read a browser-only value without a
// hydration mismatch, and without setting state from inside an effect.
function subscribeToNothing() {
  return () => {}
}

function getServerSnapshot() {
  return null
}

export function SyncEditorPage() {
  const url = useSyncExternalStore(
    subscribeToNothing,
    getCollabUrl,
    getServerSnapshot
  )

  if (!url) {
    return null
  }

  return (
    <HocuspocusProviderWebsocketComponent url={url}>
      <HocuspocusRoom name="example-document">
        <SyncEditorSession />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}
