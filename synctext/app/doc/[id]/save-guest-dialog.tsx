"use client";

import { Dialog } from "@base-ui/react/dialog";
import Button from "@/app/components/ui/Button";
import { TechText } from "@/app/components/typography/Typography";
import styles from "@/app/components/ui/Popup.module.css";

type SaveGuestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionRemaining: number;
  grace: boolean;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SaveGuestDialog({
  open,
  onOpenChange,
  sessionRemaining,
  grace,
}: SaveGuestDialogProps) {
  const title = grace
    ? "This document is read-only"
    : "Save this document permanently";
  const description = grace
    ? "Log in or create an account to keep editing this document."
    : `Log in or create an account to keep this document. Your edit session ends in ${formatTime(sessionRemaining)}.`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Description className={styles.description}>
            {description}
          </Dialog.Description>
          <Button
            href="/auth"
            variant="outline"
            className={styles.actionButton}
          >
            Log in
          </Button>
          <Button href="/register" className={styles.actionButton}>
            Create account
          </Button>
          <Dialog.Close className={styles.guestLink}>
            <TechText className="text-sm max-[900px]:text-xs">
              Continue as guest
            </TechText>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
