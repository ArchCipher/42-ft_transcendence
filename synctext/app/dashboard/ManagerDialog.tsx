"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FriendIdentity from "./side-panel/FriendIdentity";

export type Feedback = { kind: "success" | "error"; text: string } | null;

type ManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: string;
  feedback?: Feedback;
  children: ReactNode;
};

// The dashboard's people dialogs (friends, editors, members): title, description,
// one feedback line, then each dialog's own content.
export default function ManagerDialog({
  open,
  onOpenChange,
  title,
  description,
  feedback = null,
  children,
}: ManagerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="FriendsManagerDialog" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {feedback ? (
          <p
            className={`FriendsFeedback FriendsFeedback${feedback.kind === "error" ? "Error" : "Success"}`}
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}

        {children}
      </DialogContent>
    </Dialog>
  );
}

type PersonRowProps = {
  person: ComponentProps<typeof FriendIdentity>["friend"];
  children: ReactNode;
};

// One person in a people dialog: avatar and name, then the row's actions.
export function PersonRow({ person, children }: PersonRowProps) {
  return (
    <li className="FriendsManagerRow">
      <FriendIdentity friend={person} />
      <div className="FriendsManagerRowActions">{children}</div>
    </li>
  );
}

type ConfirmAlertProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
};

// A destructive confirmation opened from inside a people dialog. Radix stacks it
// over the dialog; ConfirmWindow would sit outside it and not receive clicks.
export function ConfirmAlert({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onConfirm,
  disabled = false,
}: ConfirmAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="FriendsRemoveDialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="FriendsRemoveCancel" disabled={disabled}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="FriendsRemoveAction"
            variant="destructive"
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
