// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client"

import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react"
import { useEditor } from "@tiptap/react"

import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret"

import {
  SimpleEditorView,
  simpleEditorConfig,
  baseTiptapExtensions,
} from "@/components/tiptap-templates/simple/simple-editor-view"
import { SyncHeader } from "@/components/sync/sync-header"
import { getLocalUser } from "@/lib/sync/sync-user"

type SyncUser = { name: string; color: string }

// nginx proxies /collab to Hocuspocus on the same host, kept same-origin so it
// works behind the app's CSP and TLS setup. Guarded for SSR: real value only
// matters once the provider actually connects, in the browser.
function getCollabUrl() {
  if (typeof window === "undefined") return ""
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${window.location.host}/collab`
}

// Rendered as a child of HocuspocusRoom (below), since useHocuspocusProvider()
// can only be called by a descendant of that component, not by the
// component that renders it — SyncEditorPage can't build the editor itself.
function SyncEditorSession({ user }: { user: SyncUser }) {
  const provider = useHocuspocusProvider()

  const editor = useEditor({
    ...simpleEditorConfig,
    // Same rich-text feature set as simple-editor.tsx (baseTiptapExtensions,
    // undoRedo off since Collaboration manages history itself through Yjs),
    // plus Collaboration/CollaborationCaret bound to the Hocuspocus provider
    // instead of a static content document.
    extensions: [
      ...baseTiptapExtensions({ undoRedo: false }),
      Collaboration.configure({ document: provider.document }),
      CollaborationCaret.configure({ provider, user }),
    ],
  })

  return (
    <>
      <SyncHeader />
      <SimpleEditorView editor={editor} />
    </>
  )
}

type SyncEditorPageProps = {
  docId?: string
  user?: SyncUser
}

export function SyncEditorPage({ docId = "example-document", user }: SyncEditorPageProps) {
  const localUser = user ?? getLocalUser()

  return (
    <HocuspocusProviderWebsocketComponent url={getCollabUrl()}>
      <HocuspocusRoom name={docId}>
        <SyncEditorSession user={localUser} />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}
