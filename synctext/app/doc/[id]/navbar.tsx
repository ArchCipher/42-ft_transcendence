"use client";

import { useEffect, useState } from "react";

import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { CollabUser, ConnectionStatus } from "@hocuspocus/provider-react";
import { DocumentTitle } from "./document-title";
import { renameDocument_api } from "@/app/dashboard/document/document";
import { SnapshotHistory } from "@/components/sync/snapshot-history";

import styles from "./document-navbar.module.css";
import { useHydrated } from "@/hooks/use-hydrated";

type SyncUser = { name: string; color: string };

type DocumentNavbarProps = {
  docId: string;
  initialTitle: string;
  canRename: boolean;
  provider: HocuspocusProvider | null;
  status: ConnectionStatus;
  users: CollabUser[];
};

const STATUS_COLOR = {
  connected: "bg-emerald-400",
  connecting: "bg-amber-300",
  disconnected: "bg-zinc-500",
} as const;

function collaboratorIdentity({ user }: CollabUser): SyncUser {
  const identity = (user && typeof user === "object" ? user : {}) as Record<
    string,
    unknown
  >;
  return {
    name:
      typeof identity.name === "string" && identity.name ? identity.name : "?",
    color: typeof identity.color === "string" ? identity.color : "#94a3b8",
  };
}

export function DocumentNavbar({
  docId,
  initialTitle,
  canRename,
  provider,
  status,
  users,
}: DocumentNavbarProps) {
  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");

  const mounted = useHydrated();

  // Broadcast only: the map is observed but never read at mount, because
  // Postgres is the source of truth and a rename from the dashboard never
  // touches Yjs — a title stored here can be older than the database.
  useEffect(() => {
    if (!provider) return;
    const meta = provider.document.getMap<string>("meta");
    const onMetaChange = () => {
      const nextTitle = meta.get("title");
      if (nextTitle) setTitle(nextTitle);
    };
    meta.observe(onMetaChange);
    return () => meta.unobserve(onMetaChange);
  }, [provider]);

  function cancelEditing() {
    setDraftTitle(title);
    setRenameError("");
    setIsEditing(false);
  }

  async function saveTitle() {
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === title) {
      setDraftTitle(title);
      setIsEditing(false);
      return;
    }

    setIsRenaming(true);
    setRenameError("");
    try {
      const renamedDocument = await renameDocument_api(docId, nextTitle);
      setTitle(renamedDocument.title);
      setDraftTitle(renamedDocument.title);
      setIsEditing(false);
      provider?.document
        .getMap<string>("meta")
        .set("title", renamedDocument.title);
    } catch {
      setRenameError("Could not rename document");
    } finally {
      setIsRenaming(false);
    }
  }

  return (
    <header className={`${styles.guestNavbar}`}>
      <nav aria-label="Document navigation" className={styles.navigation}>
        {/* Document title */}
        <DocumentTitle
          title={title}
          draftTitle={draftTitle}
          isEditing={isEditing}
          isRenaming={isRenaming}
          renameError={renameError}
          canRename={canRename}
          errorId="document-rename-error"
          readOnlyHint="You have view-only access"
          onStartEdit={() => {
            setDraftTitle(title);
            setIsEditing(true);
          }}
          onDraftChange={setDraftTitle}
          onSubmit={() => void saveTitle()}
          onCancel={cancelEditing}
        />

        {/* Right: avatars + connection status + history */}
        <div className={styles.rightControls}>
          {mounted && users.length > 0 ? (
            <div
              className="flex min-w-0 -space-x-1"
              aria-label={`${users.length} other${users.length === 1 ? "" : "s"} online`}
            >
              {users.slice(0, 4).map((onlineUser) => {
                const identity = collaboratorIdentity(onlineUser);
                return (
                  <span
                    key={onlineUser.clientId}
                    title={identity.name}
                    className="inline-flex size-8
                            items-center justify-center rounded-full
                            border-2 border-[oklch(0.12_0.006_285)] text-xs font-semibold text-white"
                    style={{ backgroundColor: identity.color }}
                  >
                    {identity.name[0]?.toUpperCase()}
                  </span>
                );
              })}
              {users.length > 4 ? (
                <span
                  className="inline-flex size-8 items-center justify-center rounded-full border-2 border-[oklch(0.12_0.006_285)] bg-zinc-700 text-[10px] font-semibold text-white"
                  title={`${users.length - 4} more online`}
                >
                  +{users.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
          {!isEditing ? (
            <span
              className="inline-flex items-center gap-1.5 text-[rgba(244,242,238,0.65)]"
              aria-label={`Connection status: ${status}`}
              role="status"
              aria-live="polite"
              title={status}
            >
              <span
                className={`size-2 rounded-full ${STATUS_COLOR[status]}`}
                aria-hidden="true"
              />
            </span>
          ) : null}
          <SnapshotHistory key={docId} docId={docId}
            canRestore={canRename}
            isConnected={status === "connected"}/>
        </div>
      </nav>
    </header>
  );
}
