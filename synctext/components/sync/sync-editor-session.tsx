"use client"

import {
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react"
import { useEditor } from "@tiptap/react"
import type { HocuspocusProvider } from "@hocuspocus/provider"

// --- Tiptap Core Extensions (same capabilities as simple-editor.tsx) ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { FindAndReplace } from "@tiptap/extension-find-and-replace"
import { Selection } from "@tiptap/extensions"

// --- Collaboration Extensions ---
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"

// --- Components ---
import { SimpleEditorView } from "@/components/tiptap-templates/simple/simple-editor-view"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import { getLocalUser } from "@/lib/sync/sync-user"

// Same node/mark capabilities as simple-editor.tsx, plus Collaboration and
// CollaborationCaret bound to the Hocuspocus provider instead of a static
// content document. Kept as its own top-level function (same pattern
// simple-editor.tsx uses for MainToolbarContent/MobileToolbarContent) so
// SyncEditorSession() below stays readable instead of being buried in
// extension config.
function syncExtensions(
  provider: HocuspocusProvider,
  user: { name: string; color: string }
) {
  return [
    StarterKit.configure({
      horizontalRule: false,
      undoRedo: false,
      link: {
        openOnClick: false,
        enableClickSelection: true,
      },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Image,
    Typography,
    Superscript,
    Subscript,
    Selection,
    FindAndReplace.configure({
      searchDebounceMs: 500,
      injectCSS: false,
    }),
    ImageUploadNode.configure({
      accept: "image/*",
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: handleImageUpload,
      onError: (error) => console.error("Upload failed:", error),
    }),
    Collaboration.configure({ document: provider.document }),
    CollaborationCaret.configure({ provider, user }),
  ]
}

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
    extensions: syncExtensions(provider, localUser),
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
