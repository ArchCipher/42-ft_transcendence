"use client";

import "./DashboardSidebar.css";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import InputBox from "@/app/components/form/InputBox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FriendUser, FriendsResponse } from "@/lib/friends/types";
import type { GroupMemberSummary, GroupSummary } from "@/lib/groups/types";
import { useCallback, useMemo, useState } from "react";
import { usePoll } from "@/hooks/use-poll";
import { Plus } from "lucide-react";
import ConfirmWindow from "@/app/components/feedback/ConfirmWindow";
import FriendIdentity from "./FriendIdentity";
import FriendsManagerDialog from "./FriendsManagerDialog";
import GroupNameDialog from "./GroupNameDialog";
import AddMemberDialog from "./AddMemberDialog";
import ActionMenu, { type ActionItem } from "../ActionMenu";
import { request } from "../request";
import {
  createGroup_api,
  deleteGroup_api,
  groupLabel,
  listMembers_api,
  removeMember_api,
  renameGroup_api,
  setMemberRole_api,
} from "../group/group";

type DashboardSidebarProps = {
  userId: string;
  groups: GroupSummary[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onGroupsChanged: () => Promise<void>;
  isOpen: boolean;
};

// A Delete / Leave / Remove waiting for the user's confirmation.
type PendingConfirm = { title: string; message: string; confirmLabel: string; run: () => Promise<void> };
type FriendFeedback = { kind: "success" | "error"; text: string } | null;

const EMPTY_FRIENDS: FriendsResponse = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

function PresenceLight({ online }: { online: boolean }) {
  const label = online ? "Online" : "Offline";
  return (
    <span
      className={`FriendStatus ${online ? "FriendOnline" : "FriendOffline"}`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}

export default function DashboardSidebar({ userId, groups, selectedGroupId, onSelectGroup, onGroupsChanged, isOpen }: DashboardSidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>(["groups"]);
  const [friendsData, setFriendsData] = useState<FriendsResponse>(EMPTY_FRIENDS);
  const [members, setMembers] = useState<GroupMemberSummary[]>([]);
  const [nameDialog, setNameDialog] = useState<{ group?: GroupSummary } | null>(null); // no group: New group
  const [addMemberGroup, setAddMemberGroup] = useState<GroupSummary | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [groupError, setGroupError] = useState("");
  const [friendsSearch, setFriendsSearch] = useState("");
  const [friendsManagerOpen, setFriendsManagerOpen] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendActionKey, setFriendActionKey] = useState<string | null>(null);
  const [friendFeedback, setFriendFeedback] = useState<FriendFeedback>(null);

  const membersOpen = openSections.includes("members");

  const refreshFriends = useCallback(async (signal?: AbortSignal) => {
    setFriendsLoading(true);
    try {
      const nextFriends = await request<FriendsResponse>("/api/friends", { signal });
      setFriendsData(nextFriends);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Failed to load friends", error);
      }
    } finally {
      if (!signal?.aborted) setFriendsLoading(false);
    }
  }, []);

  const refreshMembers = useCallback(async (signal?: AbortSignal) => {
    if (selectedGroupId) setMembers(await listMembers_api(selectedGroupId, signal));
  }, [selectedGroupId]);

  // Friends always, even folded: the incoming-requests badge depends on them.
  usePoll(refreshFriends);
  usePoll(refreshMembers, membersOpen && selectedGroupId !== null);

  const memberIds = useMemo(() => new Set(members.map(({ userId }) => userId)), [members]);
  const sortedFriends = useMemo(
    () => [...friendsData.friends]
      .filter((friend) => friend.username.toLocaleLowerCase().includes(friendsSearch.trim().toLocaleLowerCase()))
      .sort((a, b) => Number(memberIds.has(b.id)) - Number(memberIds.has(a.id))),
    [friendsData.friends, friendsSearch, memberIds],
  );

  async function mutateFriends(
    actionKey: string,
    sendRequest: () => Promise<unknown>,
    successMessage: string,
  ) {
    setFriendActionKey(actionKey);
    setFriendFeedback(null);
    try {
      await sendRequest();
      await refreshFriends();
      setFriendFeedback({ kind: "success", text: successMessage });
      return true;
    } catch (error) {
      setFriendFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
      return false;
    } finally {
      setFriendActionKey(null);
    }
  }

  function sendFriendRequest(identifier: string) {
    return mutateFriends(
      "send",
      () => request("/api/friends", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      }),
      "Friend request sent.",
    );
  }

  function respondToFriendRequest(friend: FriendUser, action: "accept" | "decline") {
    return mutateFriends(
      `respond-${friend.id}`,
      () => request("/api/friends", {
        method: "PATCH",
        body: JSON.stringify({ userId: friend.id, action }),
      }),
      action === "accept" ? `You are now friends with ${friend.username}.` : "Friend request declined.",
    );
  }

  function cancelFriendRequest(friend: FriendUser) {
    return mutateFriends(
      `cancel-${friend.id}`,
      () => request("/api/friends", {
        method: "DELETE",
        body: JSON.stringify({ userId: friend.id }),
      }),
      "Friend request cancelled.",
    );
  }

  function removeFriend(friend: FriendUser) {
    return mutateFriends(
      `remove-${friend.id}`,
      () => request("/api/friends", {
        method: "DELETE",
        body: JSON.stringify({ userId: friend.id }),
      }),
      `${friend.username} was removed from your friends.`,
    );
  }

  const myRole = groups.find((group) => group.id === selectedGroupId)?.myRole;

  // Run a group or member action, then reload what it changed.
  async function runAction(action: () => Promise<unknown>, reload: () => Promise<unknown>) {
    setGroupError("");
    try {
      await action();
      await reload();
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function createGroup(name: string) {
    const group = await createGroup_api(name);
    await onGroupsChanged();
    onSelectGroup(group.id);
  }

  async function renameGroup(group: GroupSummary, name: string) {
    await renameGroup_api(group.id, name);
    await onGroupsChanged();
  }

  // A group's "…" menu, by the caller's role. A private space has none.
  function groupActions(group: GroupSummary): ActionItem[] {
    if (group.isPrivateSpace) return [];
    const isOwner = group.myRole === "OWNER";
    const items: ActionItem[] = [];

    if (isOwner) {
      items.push({ label: "Rename group", onSelect: () => setNameDialog({ group }) });
    }
    if (group.myRole !== "MEMBER") {
      items.push({ label: "Add member", onSelect: () => { setAddMemberGroup(group); void refreshFriends(); } });
    }
    items.push({
      label: "Leave group",
      danger: true,
      onSelect: () => setPendingConfirm({
        title: `Leave ${group.name}?`,
        message: isOwner
          ? "Ownership passes to the oldest admin, else the oldest member. If you are the last member, the group and its documents are deleted. To choose the next owner, use Make owner in the members list first."
          : "You will lose access to its documents.",
        confirmLabel: "Leave",
        run: () => runAction(() => removeMember_api(group.id, userId), onGroupsChanged),
      }),
    });
    if (isOwner) {
      items.push({
        label: "Delete group",
        danger: true,
        onSelect: () => setPendingConfirm({
          title: `Delete ${group.name}?`,
          message: "Its documents are deleted with it. This action cannot be undone.",
          confirmLabel: "Delete",
          run: () => runAction(() => deleteGroup_api(group.id), onGroupsChanged),
        }),
      });
    }
    return items;
  }

  // A member's "…" menu: the owner promotes, demotes, hands the group over and
  // removes anyone; an admin removes plain members. Nobody acts on the owner.
  function memberActions(member: GroupMemberSummary): ActionItem[] {
    const groupId = selectedGroupId;
    if (!groupId || member.role === "OWNER") return [];
    const items: ActionItem[] = [];

    if (myRole === "OWNER") {
      const role = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
      items.push({
        label: role === "ADMIN" ? "Make admin" : "Revoke admin",
        onSelect: () => void runAction(() => setMemberRole_api(groupId, member.userId, role), refreshMembers),
      });
      items.push({
        label: "Make owner",
        onSelect: () => setPendingConfirm({
          title: `Make ${member.username} the owner?`,
          message: "You become an admin and can no longer rename or delete the group.",
          confirmLabel: "Make owner",
          run: () => runAction(
            () => setMemberRole_api(groupId, member.userId, "OWNER"),
            () => Promise.all([onGroupsChanged(), refreshMembers()]),
          ),
        }),
      });
    }
    if (myRole === "OWNER" || (myRole === "ADMIN" && member.role === "MEMBER")) {
      items.push({
        label: "Remove member",
        danger: true,
        onSelect: () => setPendingConfirm({
          title: `Remove ${member.username}?`,
          message: "They lose access to the group and its documents.",
          confirmLabel: "Remove",
          run: () => runAction(() => removeMember_api(groupId, member.userId), refreshMembers),
        }),
      });
    }
    return items;
  }

  return (
    <aside className={`DashboardSidebar ${isOpen ? "DashboardSidebarOpen" : ""}`}>
      <div className="SidebarContent">
        {groupError ? <p className="FriendsFeedback FriendsFeedbackError" role="alert">{groupError}</p> : null}
        <Accordion multiple value={openSections} onValueChange={setOpenSections} className="SidebarAccordion">
        <AccordionItem value="groups" className="SidebarAccordionItem">
          <AccordionTrigger className="SidebarAccordionTrigger">
            <TechText>
              Groups
            </TechText>
          </AccordionTrigger>

          <AccordionContent className="SidebarAccordionContent">

            <InputBox
              type="search"
              placeholder="Search groups..."
              aria-label="Search groups"
            />

            <div className="SidebarAddX">
              <Button
                variant="outline"
                className="SidebarButton"
                onClick={() => setNameDialog({})}
              >
                New group
                <Plus size={16} aria-hidden="true" />
              </Button>
            </div>

            <div className="SidebarGroupList">
              {groups.map((group) => (
                <div key={group.id} className="SidebarActionRow">
                  <button
                    type="button"
                    className={`SidebarGroup ${
                      selectedGroupId === group.id ? "SidebarGroupActive" : ""
                    }`}
                    onClick={() => onSelectGroup(group.id)}
                  >
                    <span>{groupLabel(group)}</span>
                  </button>

                  <ActionMenu
                    label={`Actions for ${groupLabel(group)}`}
                    items={groupActions(group)}
                    className="SidebarEditButton"
                  />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="members" className={`SidebarAccordionItem ${members.filter((member) => member.userId !== userId).length === 0 ? "SidebarAccordionItemEmpty" : ""}`}>
            <AccordionTrigger className="SidebarAccordionTrigger"><TechText>Members</TechText></AccordionTrigger>
            <AccordionContent className="SidebarAccordionContent">
              <div className="SidebarFriendList">
                {members.filter((member) => member.userId !== userId).map((member) => (
                  <div key={member.userId} className="SidebarActionRow">
                    <div className="SidebarFriend">
                      <PresenceLight online={member.online} />
                      <span>{member.username}</span>
                      {member.role !== "MEMBER" && <span className="SidebarRole">{member.role.toLowerCase()}</span>}
                    </div>
                    <ActionMenu
                      label={`Actions for ${member.username}`}
                      items={memberActions(member)}
                      className="SidebarEditButton"
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="friends" className="SidebarAccordionItem">
            <AccordionTrigger className="SidebarAccordionTrigger">
              <TechText>Friends</TechText>
              {friendsData.incomingRequests.length ? <span className="FriendsRequestBadge" aria-label={`${friendsData.incomingRequests.length} incoming friend requests`}>{friendsData.incomingRequests.length}</span> : null}
            </AccordionTrigger>
            <AccordionContent className="SidebarAccordionContent">
              <InputBox
                type="search"
                placeholder="Search friends..."
                aria-label="Search friends"
                value={friendsSearch}
                onChange={(event) => setFriendsSearch(event.target.value)}
              />
              <div className="SidebarAddX">
                <Button variant="outline" className="SidebarButton" onClick={() => {
                  setFriendsManagerOpen(true);
                  void refreshFriends();
                }}>
                  Manage friends
                </Button>
              </div>
              <div className="SidebarFriendList">
                {friendsLoading ? <p className="FriendsSidebarState">Refreshing friends…</p> : null}
                {!friendsLoading && !sortedFriends.length ? <p className="FriendsSidebarState">{friendsSearch ? "No matching friends." : "No friends yet. Add a collaborator to get started."}</p> : null}
                {sortedFriends.map((friend) => <FriendIdentity key={friend.id} friend={friend} compact />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <FriendsManagerDialog
          open={friendsManagerOpen}
          onOpenChange={(open) => {
            setFriendsManagerOpen(open);
            if (open) void refreshFriends();
          }}
          friends={friendsData}
          isLoading={friendsLoading}
          actionKey={friendActionKey}
          feedback={friendFeedback}
          onSend={sendFriendRequest}
          onRespond={respondToFriendRequest}
          onCancel={cancelFriendRequest}
          onRemove={removeFriend}
        />
        {nameDialog && (
          <GroupNameDialog
            title={nameDialog.group ? "Rename group" : "New group"}
            submitLabel={nameDialog.group ? "Rename" : "Create"}
            initialName={nameDialog.group?.name}
            onSubmit={(name) => (nameDialog.group ? renameGroup(nameDialog.group, name) : createGroup(name))}
            onClose={() => setNameDialog(null)}
          />
        )}
        {addMemberGroup && (
          <AddMemberDialog
            group={addMemberGroup}
            friends={friendsData.friends}
            onClose={() => setAddMemberGroup(null)}
            onAdded={() => void refreshMembers().catch(console.error)}
          />
        )}
        {pendingConfirm && (
          <ConfirmWindow
            title={pendingConfirm.title}
            message={pendingConfirm.message}
            confirmLabel={pendingConfirm.confirmLabel}
            onCancel={() => setPendingConfirm(null)}
            onConfirm={() => {
              setPendingConfirm(null);
              void pendingConfirm.run();
            }}
          />
        )}
      </div>
    </aside>
  );
}
