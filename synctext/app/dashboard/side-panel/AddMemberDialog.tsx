"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import type { FriendUser } from "@/lib/friends/types";
import type { GroupSummary } from "@/lib/groups/types";
import { Button } from "@/components/ui/button";
import ManagerDialog, { PersonRow, type Feedback } from "../ManagerDialog";
import { addMember_api, groupLabel, listMembers_api } from "../group/group";

type AddMemberDialogProps = {
  group: GroupSummary;
  friends: FriendUser[];
  onClose: () => void;
  onAdded: () => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

// The caller's friends who are not yet in the group, each with an Add button:
// only an accepted friend can be added, always as a plain member.
export default function AddMemberDialog({ group, friends, onClose, onAdded }: AddMemberDialogProps) {
  const [memberIds, setMemberIds] = useState<Set<string> | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    const controller = new AbortController();
    listMembers_api(group.id, controller.signal)
      .then((members) => setMemberIds(new Set(members.map((member) => member.userId))))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setFeedback({ kind: "error", text: errorMessage(err) });
      });
    return () => controller.abort();
  }, [group.id]);

  async function addMember(friend: FriendUser) {
    setPendingId(friend.id);
    setFeedback(null);
    try {
      await addMember_api(group.id, friend.id);
      setMemberIds((ids) => new Set(ids).add(friend.id));
      setFeedback({ kind: "success", text: `${friend.username} was added to the group.` });
      onAdded();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  const candidates = memberIds ? friends.filter((friend) => !memberIds.has(friend.id)) : [];

  return (
    <ManagerDialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={`Add to ${groupLabel(group)}`}
      description="Only your friends can be added. They join as members."
      feedback={feedback}
    >
      {memberIds === null && feedback === null ? <p className="FriendsEmpty">Loading…</p> : null}
      {memberIds !== null && candidates.length === 0 ? (
        <p className="FriendsEmpty">All your friends are already in this group.</p>
      ) : null}

      <ul className="FriendsManagerList">
        {candidates.map((friend) => (
          <PersonRow key={friend.id} person={friend}>
            <Button
              className="FriendsDialogPrimary"
              disabled={pendingId === friend.id}
              onClick={() => void addMember(friend)}
            >
              <UserPlus aria-hidden="true" /> Add
            </Button>
          </PersonRow>
        ))}
      </ul>
    </ManagerDialog>
  );
}
