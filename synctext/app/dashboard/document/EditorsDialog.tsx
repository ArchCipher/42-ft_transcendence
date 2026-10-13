"use client";

import { useEffect, useState } from "react";
import type { DocumentEditorSummary, DocumentSummary } from "@/lib/documents/documents";
import { Button } from "@/components/ui/button";
import ManagerDialog, { ConfirmAlert, PersonRow } from "../ManagerDialog";
import { listEditors_api, setEditor_api } from "./document";

type EditorsDialogProps = {
  document: DocumentSummary;
  userId: string;
  onClose: () => void;
  onSelfRevoked: () => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

// Every member of the document's group, made editor or taken back to viewer one
// at a time; the owner always edits.
export default function EditorsDialog({ document, userId, onClose, onSelfRevoked }: EditorsDialogProps) {
  const [editors, setEditors] = useState<DocumentEditorSummary[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmSelfRevoke, setConfirmSelfRevoke] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listEditors_api(document.id)
      .then((list) => { if (!cancelled) setEditors(list); })
      .catch((err: unknown) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [document.id]);

  async function setEditor(editor: DocumentEditorSummary, canEdit: boolean) {
    setError("");
    setPendingId(editor.userId);
    try {
      await setEditor_api(document.id, editor.userId, canEdit);
      if (editor.userId === userId && !canEdit) return onSelfRevoked();
      setEditors((list) => list && list.map((e) => (e.userId === editor.userId ? { ...e, canEdit } : e)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPendingId(null);
    }
  }

  const me = editors?.find((editor) => editor.userId === userId);

  return (
    <>
      <ManagerDialog
        open
        onOpenChange={(open) => { if (!open) onClose(); }}
        title={`Manage editors of ${document.title}`}
        description="Every member of the group can read. Editors can also write, rename, delete and manage editors."
        feedback={error ? { kind: "error", text: error } : null}
      >
        {editors === null && !error ? <p className="FriendsEmpty">Loading…</p> : null}

        <ul className="FriendsManagerList">
          {editors?.map((editor) => (
            <PersonRow key={editor.userId} person={editor}>
              {editor.role === "OWNER" ? (
                <span className="FriendsEmpty">Owner, always edits</span>
              ) : editor.canEdit ? (
                <Button
                  className="FriendsDialogQuiet"
                  variant="ghost"
                  disabled={pendingId === editor.userId}
                  onClick={() => (editor === me ? setConfirmSelfRevoke(true) : void setEditor(editor, false))}
                >
                  Remove editor
                </Button>
              ) : (
                <Button
                  className="FriendsDialogPrimary"
                  disabled={pendingId === editor.userId}
                  onClick={() => void setEditor(editor, true)}
                >
                  Make editor
                </Button>
              )}
            </PersonRow>
          ))}
        </ul>
      </ManagerDialog>

      <ConfirmAlert
        open={confirmSelfRevoke}
        onOpenChange={setConfirmSelfRevoke}
        title="Remove your edit access?"
        description="You will become read-only on this document and no longer manage its editors."
        cancelLabel="Keep access"
        confirmLabel="Remove my access"
        onConfirm={() => me && void setEditor(me, false)}
      />
    </>
  );
}
