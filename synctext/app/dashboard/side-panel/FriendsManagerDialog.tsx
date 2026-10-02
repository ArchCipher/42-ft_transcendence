"use client";

import { FormEvent, useState } from "react";
import { Check, Send, UserMinus, X } from "lucide-react";
import type { FriendUser, FriendsResponse } from "@/lib/friends/types";
import { Button } from "@/components/ui/button";
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
import FriendIdentity from "./FriendIdentity";

type Feedback = { kind: "success" | "error"; text: string } | null;

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

function RequestRow({
  friend,
  children,
}: {
  friend: FriendUser;
  children: React.ReactNode;
}) {
  return (
    <li className="FriendsManagerRow">
      <FriendIdentity friend={friend} />
      <div className="FriendsManagerRowActions">{children}</div>
    </li>
  );
}

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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="FriendsManagerDialog" showCloseButton>
          <DialogHeader>
            <DialogTitle>Your collaborators</DialogTitle>
            <DialogDescription>
              Invite people, respond to requests, and keep your workspace connected.
            </DialogDescription>
          </DialogHeader>

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

          {feedback ? (
            <p className={`FriendsFeedback FriendsFeedback${feedback.kind === "error" ? "Error" : "Success"}`} role={feedback.kind === "error" ? "alert" : "status"}>
              {feedback.text}
            </p>
          ) : null}

          <div className="FriendsManagerSections" aria-busy={isLoading}>
            <section aria-labelledby="incoming-requests-heading">
              <div className="FriendsSectionHeading">
                <h3 id="incoming-requests-heading">Incoming requests</h3>
                <span>{friends.incomingRequests.length}</span>
              </div>
              {friends.incomingRequests.length ? (
                <ul className="FriendsManagerList">
                  {friends.incomingRequests.map((friend) => (
                    <RequestRow key={friend.id} friend={friend}>
                      <Button className="FriendsDialogPrimary" size="sm" onClick={() => void onRespond(friend, "accept")} disabled={actionKey === `respond-${friend.id}`}>
                        <Check aria-hidden="true" /> Accept
                      </Button>
                      <Button className="FriendsDialogQuiet" size="sm" variant="ghost" onClick={() => void onRespond(friend, "decline")} disabled={actionKey === `respond-${friend.id}`}>
                        <X aria-hidden="true" /> Decline
                      </Button>
                    </RequestRow>
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
                    <RequestRow key={friend.id} friend={friend}>
                      <Button className="FriendsDialogQuiet" size="sm" variant="ghost" onClick={() => void onCancel(friend)} disabled={actionKey === `cancel-${friend.id}`}>
                        Cancel request
                      </Button>
                    </RequestRow>
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
                    <RequestRow key={friend.id} friend={friend}>
                      <Button className="FriendsDialogDanger" size="sm" variant="destructive" onClick={() => setFriendToRemove(friend)} disabled={actionKey === `remove-${friend.id}`}>
                        <UserMinus aria-hidden="true" /> Remove
                      </Button>
                    </RequestRow>
                  ))}
                </ul>
              ) : <p className="FriendsEmpty">Friends you add will appear here.</p>}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={friendToRemove !== null} onOpenChange={(nextOpen) => !nextOpen && setFriendToRemove(null)}>
        <AlertDialogContent className="FriendsRemoveDialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {friendToRemove?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the friendship. You can send a new request later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="FriendsRemoveCancel" disabled={actionKey === `remove-${friendToRemove?.id ?? ""}`}>Keep friend</AlertDialogCancel>
            <AlertDialogAction className="FriendsRemoveAction" variant="destructive" disabled={actionKey === `remove-${friendToRemove?.id ?? ""}`} onClick={() => void confirmRemoval()}>
              Remove friend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
