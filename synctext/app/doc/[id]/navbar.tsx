"use client";

import { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { CollabUser, ConnectionStatus } from "@hocuspocus/provider-react";
import { renameDocument_api } from "@/app/dashboard/document/document";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import InputBox from "@/app/components/form/InputBox";
import { SnapshotHistory } from "@/components/sync/snapshot-history";

import guestStyles from "./guest-navbar.module.css";
import buttonStyles from "@/app/components/ui/Button.module.css";
import ErrorNote from "@/app/components/form/ErrorNote";

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
    <header className={`${guestStyles.guestNavbar}`}>
      <nav aria-label="Document navigation" className={`${guestStyles.navigation} ${guestStyles.documentNavn}`}>
        {/* Left: snapshot history */}
        <div className={guestStyles.leftControls}>
          <SnapshotHistory
            key={docId}
            docId={docId}
			canRestore={canRename}
            isConnected={status === "connected"}
          />
        </div>

        {/* Center: document title */}
        <div className={guestStyles.titleArea}>
          {isEditing ? (
            <form
              className={guestStyles.renameForm}
              onSubmit={(event) => {
                event.preventDefault();
                void saveTitle();
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  cancelEditing();
                }
              }}
            >
              <InputBox
                autoFocus
                value={draftTitle}
                maxLength={120}
                disabled={isRenaming}
                aria-label="Document title"
                aria-describedby={
                  renameError ? "document-rename-error" : undefined
                }
                onChange={(event) => setDraftTitle(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    cancelEditing();
                  }
                }}
              />
              <Button
                type="submit"
                compact
                disabled={isRenaming || !draftTitle.trim()}
                aria-label="Save document title"
              >
                <Check aria-hidden="true" size={16} />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              disabled={!canRename}
              onClick={() => {
                setDraftTitle(title);
                setIsEditing(true);
              }}
              className={guestStyles.titleButton}
              title={
                canRename ? "Rename document" : "You have view-only access"
              }
            >
              <span>{title}</span>
              {canRename ? <Pencil aria-hidden="true" size={14} /> : null}
            </button>
          )}
          {renameError ? (
			<div className="mt-2">
            <ErrorNote id="document-rename-error">{renameError}</ErrorNote>
			</div>
          ) : null}
        </div>

        {/* Right: connection status + online people */}
        <div className={guestStyles.rightControls}>
          {!isEditing ? (
            <span
			  className={[buttonStyles.button, buttonStyles.outline, buttonStyles.deactivated].join(" ")}
              aria-label={`Connection status: ${status}`}
              aria-live="polite"
              title={status}
            >
              <span
                className={`size-2 rounded-full ${STATUS_COLOR[status]}`}
                aria-hidden="true"
              />
              <TechText className="text-sm normal-case max-[900px]:hidden">
                {status}
              </TechText>
            </span>
          ) : null}

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
        </div>
      </nav>
    </header>
  );
}
