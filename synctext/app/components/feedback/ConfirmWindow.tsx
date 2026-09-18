"use client";

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
  return (
    <div className="ConfirmWindowOverlay">
      <div className="ConfirmWindow">
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
    </div>
  );
}