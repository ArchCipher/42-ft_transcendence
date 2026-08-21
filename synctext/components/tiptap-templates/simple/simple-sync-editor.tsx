// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client"

import { useEffect, useState } from 'react'
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from '@hocuspocus/provider-react'
import { EditorContent, useEditor } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { StarterKit } from '@tiptap/starter-kit'

// nginx proxies /collab to the hocuspocus server on the same origin as the
// page, so this must stay same-host (see connect-src 'self' in next.config.ts)
// rather than pointing at the "collab" docker service name or a fixed port.
function getCollabUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${window.location.host}/collab`
}

function SyncEditor() {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: provider.document }),
      CollaborationCaret.configure({
        provider,
        user: { name: 'John Doe', color: '#ffcc00' },
      }),
    ],
  })

  return (
    <>
      <header>
        <span>Status: {status}</span>
        <span>{users.length} online</span>
      </header>
      <EditorContent editor={editor} />
    </>
  )
}

export function App() {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    setUrl(getCollabUrl())
  }, [])

  if (!url) {
    return null
  }

  return (
    <HocuspocusProviderWebsocketComponent url={url}>
      <HocuspocusRoom name="example-document">
        <SyncEditor />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  )
}