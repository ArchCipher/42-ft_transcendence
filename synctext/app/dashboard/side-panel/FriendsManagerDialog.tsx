"use client";

import { FormEvent, useState } from "react";
import { Check, Send, UserMinus, X } from "lucide-react";
import type { FriendUser, FriendsResponse } from "@/lib/friends/types";
import { Button } from "@/components/ui/button";
import ManagerDialog, { ConfirmAlert, PersonRow, type Feedback } from "../ManagerDialog";

type FriendsManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: FriendsResponse;
  isLoading: boolean;
  actionKey: string | null;
  feedback: Feedback;
  onSend: (identifier: string) => Promise<boolean>;
  onRespond: (friend: FriendUser, action: "accept" | "decline") => Promise<boolean>;
  onCancel: (friend: FriendUser) => Promise<boolean>;
  onRemove: (friend: FriendUser) => Promise<boolean>;
};

export default function FriendsManagerDialog({
  open,
  onOpenChange,
  friends,
  isLoading,
  actionKey,
  feedback,
  onSend,
  onRespond,
  onCancel,
  onRemove,
}: FriendsManagerDialogProps) {
  const [identifier, setIdentifier] = useState("");
  const [friendToRemove, setFriendToRemove] = useState<FriendUser | null>(null);
  const sending = actionKey === "send";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await onSend(identifier);
    if (sent) setIdentifier("");
  }

  async function confirmRemoval() {
    if (!friendToRemove) return;
    await onRemove(friendToRemove);
    setFriendToRemove(null);
  }

  return (
    <>
      <ManagerDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Your collaborators"
        description="Invite people, respond to requests, and keep your workspace connected."
        feedback={feedback}
      >
          <form className="FriendsInviteForm" onSubmit={handleSubmit}>
            <label htmlFor="friend-identifier">Invite by username or email</label>
            <div className="FriendsInviteControls">
              <input
                id="friend-identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="collaborator@example.com"
                autoComplete="off"
                disabled={sending}
              />
              <Button className="FriendsDialogPrimary" type="submit" disabled={sending || !identifier.trim()}>
                <Send aria-hidden="true" />
                {sending ? "Sending" : "Send request"}
              </Button>
            </div>
          </form>

          <div className="FriendsManagerSections" aria-busy={isLoading}>
            <section aria-labelledby="incoming-requests-heading">
              <div className="FriendsSectionHeading">
                <h3 id="incoming-requests-heading">Incoming requests</h3>
                <span>{friends.incomingRequests.length}</span>
              </div>
              {friends.incomingRequests.length ? (
                <ul className="FriendsManagerList">
                  {friends.incomingRequests.map((friend) => (
                    <PersonRow key={friend.id} person={friend}>
                      <Button className="FriendsDialogPrimary" onClick={() => void onRespond(friend, "accept")} disabled={actionKey === `respond-${friend.id}`}>
                        <Check aria-hidden="true" /> Accept
                      </Button>
                      <Button className="FriendsDialogQuiet" variant="ghost" onClick={() => void onRespond(friend, "decline")} disabled={actionKey === `respond-${friend.id}`}>
                        <X aria-hidden="true" /> Decline
                      </Button>
                    </PersonRow>
                  ))}
                </ul>
              ) : <p className="FriendsEmpty">No requests waiting for you.</p>}
            </section>

            <section aria-labelledby="sent-requests-heading">
              <div className="FriendsSectionHeading">
                <h3 id="sent-requests-heading">Sent requests</h3>
                <span>{friends.outgoingRequests.length}</span>
              </div>
              {friends.outgoingRequests.length ? (
                <ul className="FriendsManagerList">
                  {friends.outgoingRequests.map((friend) => (
                    <PersonRow key={friend.id} person={friend}>
                      <Button className="FriendsDialogQuiet" variant="ghost" onClick={() => void onCancel(friend)} disabled={actionKey === `cancel-${friend.id}`}>
                        Cancel request
                      </Button>
                    </PersonRow>
                  ))}
                </ul>
              ) : <p className="FriendsEmpty">No sent requests.</p>}
            </section>

            <section aria-labelledby="your-friends-heading">
              <div className="FriendsSectionHeading">
                <h3 id="your-friends-heading">Your friends</h3>
                <span>{friends.friends.length}</span>
              </div>
              {friends.friends.length ? (
                <ul className="FriendsManagerList">
                  {friends.friends.map((friend) => (
                    <PersonRow key={friend.id} person={friend}>
                      <Button className="FriendsDialogDanger" variant="destructive" onClick={() => setFriendToRemove(friend)} disabled={actionKey === `remove-${friend.id}`}>
                        <UserMinus aria-hidden="true" /> Remove
                      </Button>
                    </PersonRow>
                  ))}
                </ul>
              ) : <p className="FriendsEmpty">Friends you add will appear here.</p>}
            </section>
          </div>
      </ManagerDialog>

      <ConfirmAlert
        open={friendToRemove !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setFriendToRemove(null); }}
        title={`Remove ${friendToRemove?.username}?`}
        description="This removes the friendship. You can send a new request later if needed."
        cancelLabel="Keep friend"
        confirmLabel="Remove friend"
        onConfirm={() => void confirmRemoval()}
        disabled={actionKey === `remove-${friendToRemove?.id ?? ""}`}
      />
    </>
  );
}
