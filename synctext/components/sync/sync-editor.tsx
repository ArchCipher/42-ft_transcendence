// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
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
import { DocumentNavbar } from "@/components/sync/document-navbar"
import { getDocument_api } from "@/app/dashboard/document/document"
import { fetchSessionUser, getLocalUser } from "@/lib/sync/sync-user"

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
type SyncEditorSessionProps = {
  docId: string
  title: string
  user: SyncUser
  canRename: boolean
}

function SyncEditorSession({ docId, title, user, canRename }: SyncEditorSessionProps) {
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
      <DocumentNavbar
        docId={docId}
        initialTitle={title}
        canRename={canRename}
      />
      <SimpleEditorView editor={editor} />
    </>
  )
}

// /doc/edit is a single, id-agnostic static page — a proxy rewrite never
// changes what the browser itself reports, so the actual document id still
// lives in the URL the visitor is looking at (/doc/<id>) and is recovered
// from there, via the reactive usePathname() rather than a one-time
// window.location read (a client-side navigation from one doc to another
// re-renders this component with a new pathname, and must not keep the
// previous document's Hocuspocus connection alive).
function docIdFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  return segments[0] === "doc" ? (segments[1] ?? null) : null
}

type SessionData = { user: SyncUser; title: string; canRename: boolean }

export function SyncEditorPage() {
  const pathname = usePathname()
  const docId = docIdFromPathname(pathname) ?? "example-document"
  const [session, setSession] = useState<SessionData | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSessionUser(), getDocument_api(docId)]).then(([identity, document]) => {
      if (!cancelled) {
        setSession({
          user: identity ?? getLocalUser(),
          title: document.title,
          canRename: document.canRename,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [docId])

  if (!session) return null

  return (
    // Keyed by docId: forces the whole subtree (provider, room, editor) to
    // unmount and remount on a client-side navigation to a different
    // document, instead of reusing the previous document's connection.
    <HocuspocusProviderWebsocketComponent key={docId} url={getCollabUrl()}>
      <HocuspocusRoom name={docId}>
        <SyncEditorSession
          docId={docId}
          title={session.title}
          user={session.user}
          canRename={session.canRename}
        />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}
