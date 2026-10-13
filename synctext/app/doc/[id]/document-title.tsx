"use client";

import { Check, Pencil } from "lucide-react";
import InputBox from "@/app/components/form/InputBox";
import Button from "@/app/components/ui/Button";
import ErrorNote from "@/app/components/form/ErrorNote";
import styles from "./document-navbar.module.css";
import buttonStyles from "@/app/components/ui/Button.module.css";

type DocumentTitleProps = {
  title: string;
  draftTitle: string;
  isEditing: boolean;
  isRenaming: boolean;
  renameError: string;
  canRename: boolean;
  errorId: string;
  readOnlyHint: string;
  onStartEdit: () => void;
  onDraftChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function DocumentTitle({
  title,
  draftTitle,
  isEditing,
  isRenaming,
  renameError,
  canRename,
  errorId,
  readOnlyHint,
  onStartEdit,
  onDraftChange,
  onSubmit,
  onCancel,
}: DocumentTitleProps) {
  return (
    <div className={styles.titleArea}>
      {isEditing ? (
        <form
          className={styles.renameForm}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          onPointerDown={(event) => {
            // Some browsers don't focus buttons on click. Keep the input
            // focused so blur cannot remove the form before Save submits.
            if (
              event.target instanceof Element &&
              event.target.closest('button[type="submit"]')
            ) {
              event.preventDefault();
            }
          }}
          onBlur={(event) => {
            if (
              !isRenaming &&
              !event.currentTarget.contains(event.relatedTarget)
            ) {
              onCancel();
            }
          }}
        >
          <InputBox
            variant="inline"
            className={`${buttonStyles.button} ${buttonStyles.outline} ${styles.renameInput}`}
            autoFocus
            value={draftTitle}
            maxLength={120}
            disabled={isRenaming}
            aria-label="Document title"
            aria-describedby={renameError ? errorId : undefined}
            onChange={(event) => onDraftChange(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !isRenaming) {
                onCancel();
              }
            }}
          />
          <Button
            type="submit"
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
          onClick={onStartEdit}
          className={styles.titleButton}
          title={canRename ? "Rename document" : readOnlyHint}
        >
          <span>{title}</span>
          {canRename ? <Pencil aria-hidden="true" size={14} /> : null}
        </button>
      )}
      {renameError ? (
        <div className="mt-2">
          <ErrorNote id={errorId}>{renameError}</ErrorNote>
        </div>
      ) : null}
    </div>
  );
}
