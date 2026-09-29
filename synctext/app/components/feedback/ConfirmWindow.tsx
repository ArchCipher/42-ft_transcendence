"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import "./ConfirmWindow.css";

type ConfirmWindowProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmWindow({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmWindowProps) {

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return createPortal(
    <div
      className="ConfirmWindowOverlay"
      onClick={onCancel}
    >
      <div
        className="ConfirmWindow"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="ConfirmWindowTitle">{title}</h2>

        <p className="ConfirmWindowMessage">{message}</p>

        <div className="ConfirmWindowActions">
          <button
            type="button"
            className="ConfirmWindowCancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="ConfirmWindowDelete"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}