// see : https://tiptap.dev/docs/hocuspocus/provider/react
"use client";

import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
  useHocuspocusAwareness,
  useHocuspocusConnectionStatus,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react";
import { SessionGuard } from "@/hooks/use-session-guard";
import { AnyExtension, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";

import {
  SimpleEditorView,
  simpleEditorConfig,
  baseTiptapExtensions,
} from "@/components/tiptap-templates/simple/simple-editor-view";
import { DocumentNavbar } from "@/app/doc/[id]/navbar";
import { GuestDocumentNavbar } from "@/app/doc/[id]/guest-navbar";
import { getLocalUser } from "@/lib/sync/sync-user";
import { Footer } from "@/app/components/footer/Footer";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePoll } from "@/hooks/use-poll";

type SyncUser = { name: string; color: string };

export type GuestEditorState = {
  editExpiresAt: string;
  expiresAt: string;
};

// nginx proxies /collab to Hocuspocus on the same origin, so this works behind
// the app's CSP and TLS. Only ever read in the browser, when the provider connects.
function getCollabUrl() {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/collab`;
}

// Child of HocuspocusRoom, since useHocuspocusProvider() only works below it —
// SyncEditorPage cannot build the editor itself.
type SyncEditorSessionProps = {
  docId: string;
  title: string;
  user: SyncUser;
  canRename: boolean;
  readOnly: boolean;
  guestState?: GuestEditorState;
};

function SyncEditorSession({
  docId,
  title,
  user,
  canRename,
  readOnly,
  guestState,
}: SyncEditorSessionProps) {
  const provider = useHocuspocusProvider();
  const status = useHocuspocusConnectionStatus();
  const users = useHocuspocusAwareness();
  // Everyone but us — a fresh Awareness already registers the local client.
  const others = users.filter(
    (onlineUser) => onlineUser.clientId !== provider.awareness?.clientID,
  );

  const mounted = useHydrated();

  const [guestReadOnly, setGuestReadOnly] = useState(() =>
    guestState
      ? Date.now() >= new Date(guestState.editExpiresAt).getTime()
      : false,
  );
  const [accessReadOnly, setAccessReadOnly] = useState(readOnly);
  const [documentUnavailable, setDocumentUnavailable] = useState(false);
  const effectiveReadOnly = accessReadOnly || guestReadOnly || documentUnavailable;

  const checkDocumentAccess = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        signal,
        cache: "no-store",
      });

      if (response.status === 404) {
        setDocumentUnavailable(true);
        setAccessReadOnly(true);
        return;
      }
      if (!response.ok) return;

      const document = (await response.json()) as { canEdit: boolean };
      setDocumentUnavailable(false);
      setAccessReadOnly(!document.canEdit);
    },
    [docId],
  );

  usePoll(checkDocumentAccess, !guestState);

  useEffect(() => {
    if (!guestState) return;
    const delay = new Date(guestState.editExpiresAt).getTime() - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setGuestReadOnly(true), delay);
    return () => window.clearTimeout(timer);
  }, [guestState]);

  useEffect(() => {
    if (!guestState) return;
    const delay = new Date(guestState.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      window.location.reload();
      return;
    }
    const timer = window.setTimeout(() => window.location.reload(), delay);
    return () => window.clearTimeout(timer);
  }, [guestState]);

  const editor = useEditor({
    ...simpleEditorConfig,
    // undoRedo off: Collaboration manages history itself, through Yjs.
    extensions: [
      ...baseTiptapExtensions({ undoRedo: false }),
      Collaboration.configure({ document: provider.document }),
      CollaborationCaret.configure({ provider, user }),
    ] as AnyExtension[],
    editable: !effectiveReadOnly,
  });

  useEffect(() => {
    editor?.setEditable(!effectiveReadOnly);
  }, [editor, effectiveReadOnly]);

  const navbar = guestState ? (
    <GuestDocumentNavbar
      docId={docId}
      initialTitle={title}
      editExpiresAt={guestState.editExpiresAt}
      expiresAt={guestState.expiresAt}
      canRename={canRename && !effectiveReadOnly}
    />
  ) : (
    <DocumentNavbar
      docId={docId}
      initialTitle={title}
      canRename={canRename && !effectiveReadOnly}
      provider={provider}
      status={status}
      users={others}
    />
  );

  const body = documentUnavailable ? (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-[rgb(244,242,238,0.75)]">
        This document is no longer available to you.
      </p>
    </div>
  ) : mounted ? (
    <>
      {!readOnly && accessReadOnly && (
        <p className="px-4 py-3 text-center text-sm text-[rgb(244,242,238,0.75)]">
          Your editing access was removed. This document is now read-only.
        </p>
      )}
      <SimpleEditorView editor={editor} showToolbar={!effectiveReadOnly} />
      <Footer />
    </>
  ) : (
    <LoadingEditorScreen />
  );

  return guestState ? (
    <>
      {navbar}
      {body}
    </>
  ) : (
    <SessionGuard>
      {navbar}
      {body}
    </SessionGuard>
  );
}

// What the server paints, title included. Its markup must stay identical to
// SyncEditorSession's first render — same empty user list, same "connecting" —
// or React discards the served HTML instead of hydrating it.
function StaticEditorShell({
  docId,
  title,
  canRename,
  readOnly,
  guestState,
}: Omit<SyncEditorSessionProps, "user">) {
  const canEdit = canRename && !readOnly;
  return (
    <>
      {guestState ? (
        <GuestDocumentNavbar
          docId={docId}
          initialTitle={title}
          editExpiresAt={guestState.editExpiresAt}
          expiresAt={guestState.expiresAt}
          canRename={canEdit}
        />
      ) : (
        <DocumentNavbar
          docId={docId}
          initialTitle={title}
          canRename={canEdit}
          provider={null}
          status="connecting"
          users={[]}
        />
      )}
      <LoadingEditorScreen />
    </>
  );
}

function LoadingEditorScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-[rgb(244,242,238,0.55)]">Loading...</p>
    </div>
  );
}

type SyncEditorPageProps = {
  docId?: string;
  title?: string;
  user?: SyncUser;
  canRename?: boolean;
  readOnly?: boolean;
  guestState?: GuestEditorState;
};

export function SyncEditorPage({
  docId = "example-document",
  title = "Untitled Document",
  user,
  canRename = true,
  readOnly = false,
  guestState,
}: SyncEditorPageProps) {
  // HocuspocusProviderWebsocket's constructor starts a timer and opens a socket
  // during render, so it must never run on the server: one leak per request.
  if (typeof window === "undefined") {
    return (
      <StaticEditorShell
        docId={docId}
        title={title}
        canRename={canRename}
        readOnly={readOnly}
        guestState={guestState}
      />
    );
  }

  const localUser = user ?? getLocalUser();

  return (
    <HocuspocusProviderWebsocketComponent url={getCollabUrl()}>
      <HocuspocusRoom name={docId}>
        <SyncEditorSession
          docId={docId}
          title={title}
          user={localUser}
          canRename={canRename}
          readOnly={readOnly}
          guestState={guestState}
        />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}
