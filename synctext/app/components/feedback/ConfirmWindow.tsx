"use client";
import "./ConfirmWindow.css";

import { DisplayText, TechText } from "@/app/components/typography/Typography";

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
        <DisplayText>{title}</DisplayText>

        <TechText className="text-sm">
          {message}
        </TechText>

        <div className="ConfirmWindowActions">
          <button type="button" onClick={onCancel}>
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