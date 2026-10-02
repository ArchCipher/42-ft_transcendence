"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import ManagerDialog from "../ManagerDialog";

type GroupNameDialogProps = {
  title: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

// Ask for a group name, for New group and Rename. Closes once onSubmit succeeds,
// otherwise shows the server's error.
export default function GroupNameDialog({ title, submitLabel, initialName = "", onSubmit, onClose }: GroupNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerDialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={title}
      description="A shared group: its members read every document in it."
      feedback={error ? { kind: "error", text: error } : null}
    >
      <form className="FriendsInviteForm" onSubmit={handleSubmit}>
        <label htmlFor="group-name">Group name</label>
        <div className="FriendsInviteControls">
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            autoComplete="off"
            autoFocus
            disabled={saving}
          />
          <Button className="FriendsDialogPrimary" type="submit" disabled={saving || !name.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </ManagerDialog>
  );
}
