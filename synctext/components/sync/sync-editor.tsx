// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client"

import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
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
import { DocumentNavbar } from "@/app/doc/[id]/navbar"
import { getLocalUser } from "@/lib/sync/sync-user"

type SyncUser = { name: string; color: string }

// nginx proxies /collab to Hocuspocus on the same origin, so this works behind
// the app's CSP and TLS. Only ever read in the browser, when the provider connects.
function getCollabUrl() {
  if (typeof window === "undefined") return ""
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${window.location.host}/collab`
}

// Child of HocuspocusRoom, since useHocuspocusProvider() only works below it —
// SyncEditorPage cannot build the editor itself.
type SyncEditorSessionProps = {
  docId: string
  title: string
  user: SyncUser
  canEdit: boolean
}

function SyncEditorSession({ docId, title, user, canEdit }: SyncEditorSessionProps) {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()
  // Everyone but us — a fresh Awareness already registers the local client.
  const others = users.filter((user) => user.clientId !== provider.awareness?.clientID)

  const editor = useEditor({
    ...simpleEditorConfig,
    editable: canEdit,
    // undoRedo off: Collaboration manages history itself, through Yjs.
    extensions: [
      ...baseTiptapExtensions({ undoRedo: false }),
      Collaboration.configure({ document: provider.document }),
      CollaborationCaret.configure({ provider, user }),
    ],
  })

  return (
    <>
      <DocumentNavbar
        docId={docId}
        initialTitle={title}
        canRename={canEdit}
        provider={provider}
        status={status}
        users={others}
      />
      <SimpleEditorView editor={editor} showToolbar={canEdit} />
    </>
  )
}

// What the server paints, title included. Its markup must stay identical to
// SyncEditorSession's first render — same empty user list, same "connecting" —
// or React discards the served HTML instead of hydrating it.
function StaticEditorShell({ docId, title, canEdit }: { docId: string; title: string; canEdit: boolean }) {
  return (
    <>
      <DocumentNavbar
        docId={docId}
        initialTitle={title}
        canRename={canEdit}
        provider={null}
        status="connecting"
        users={[]}
      />
      <SimpleEditorView editor={null} showToolbar={canEdit} />
    </>
  )
}

type SyncEditorPageProps = {
  docId?: string
  title?: string
  user?: SyncUser
  canEdit?: boolean
}

export function SyncEditorPage({
  docId = "example-document",
  title = "Untitled Document",
  user,
  canEdit = true,
}: SyncEditorPageProps) {
  // HocuspocusProviderWebsocket's constructor starts a timer and opens a socket
  // during render, so it must never run on the server: one leak per request.
  if (typeof window === "undefined") {
    return <StaticEditorShell docId={docId} title={title} canEdit={canEdit} />
  }

  const localUser = user ?? getLocalUser()

  return (
    <HocuspocusProviderWebsocketComponent url={getCollabUrl()}>
      <HocuspocusRoom name={docId}>
        <SyncEditorSession
          docId={docId}
          title={title}
          user={localUser}
          canEdit={canEdit}
        />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}
