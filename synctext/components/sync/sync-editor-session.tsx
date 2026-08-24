"use client"

import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react"
import { useEditor } from "@tiptap/react"

import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret"

import {
  SimpleEditorView,
  baseTiptapExtensions,
} from "@/components/tiptap-templates/simple/simple-editor-view"
import { getLocalUser } from "@/lib/sync/sync-user"

export function SyncEditorSession() {
  const provider = useHocuspocusProvider()
  const status = useHocuspocusConnectionStatus()
  const users = useHocuspocusAwareness()
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
      <header>
        <span>Status: {status}</span>
        <span>{users.length} online</span>
      </header>
      <SimpleEditorView editor={editor} />
    </>
  )
}
