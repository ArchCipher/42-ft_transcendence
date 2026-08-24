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
  baseTiptapExtensions,
} from "@/components/tiptap-templates/simple/simple-editor-view"
import { SyncHeader } from "@/components/sync/sync-header"
import { getLocalUser } from "@/lib/sync/sync-user"

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

// Rendered as a child of HocuspocusRoom (below), since useHocuspocusProvider()
// can only be called by a descendant of that component, not by the
// component that renders it — SyncEditorPage can't build the editor itself.
function SyncEditorSession() {
  const provider = useHocuspocusProvider()
  // Its own statement (not inlined into useEditor's arguments below) so
  // that swapping this for a real useLocalUser() hook later, once auth is
  // wired up, is a one-word change rather than a restructure.
  const localUser = getLocalUser()

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    // Same rich-text feature set as simple-editor.tsx (baseTiptapExtensions,
    // undoRedo off since Collaboration manages history itself through Yjs),
    // plus Collaboration/CollaborationCaret bound to the Hocuspocus provider
    // instead of a static content document.
    extensions: [
      ...baseTiptapExtensions({ undoRedo: false }),
      Collaboration.configure({ document: provider.document }),
      CollaborationCaret.configure({ provider, user: localUser }),
    ],
  })

  return (
    <>
      <SyncHeader />
      <SimpleEditorView editor={editor} />
    </>
  )
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
