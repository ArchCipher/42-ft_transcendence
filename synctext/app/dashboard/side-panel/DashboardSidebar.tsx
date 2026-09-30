"use client";

import "./DashboardSidebar.css";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import InputBox from "@/app/components/form/InputBox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FriendUser, FriendsResponse } from "@/lib/friends/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import FriendIdentity from "./FriendIdentity";
import FriendsManagerDialog from "./FriendsManagerDialog";

type DashboardSidebarProps = {
  selectedGroup: { id: string; name: string } | null;
  onSelectGroup: (group: { id: string; name: string } | null) => void;
  isOpen: boolean;
};

type Group = { id: string; name: string; isPrivateSpace: boolean };
type GroupMember = { userId: string; username: string; online: boolean };
type FriendFeedback = { kind: "success" | "error"; text: string } | null;

const EMPTY_FRIENDS: FriendsResponse = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

const PRESENCE_POLL_MS = 30_000;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "Something went wrong. Please try again.";
}

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

export default function DashboardSidebar({ selectedGroup, onSelectGroup, isOpen }: DashboardSidebarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["groups"]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendsData, setFriendsData] = useState<FriendsResponse>(EMPTY_FRIENDS);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [friendsSearch, setFriendsSearch] = useState("");
  const [friendsManagerOpen, setFriendsManagerOpen] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendActionKey, setFriendActionKey] = useState<string | null>(null);
  const [friendFeedback, setFriendFeedback] = useState<FriendFeedback>(null);

  const friendsOpen = openSections.includes("friends");
  const membersOpen = openSections.includes("members");
  const selectedGroupId = selectedGroup?.id ?? null;

  const refreshFriends = useCallback(async (signal?: AbortSignal) => {
    setFriendsLoading(true);
    try {
      const nextFriends = await getJson<FriendsResponse>("/api/friends", signal);
      setFriendsData(nextFriends);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Failed to load friends", error);
      }
    } finally {
      if (!signal?.aborted) setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void getJson<Group[]>("/api/groups", controller.signal)
      .then(setGroups)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load groups", error);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".SidebarActionMenu") && !target.closest(".SidebarEditButton")) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if ((!friendsOpen && !(membersOpen && selectedGroupId)) || document.visibilityState !== "visible") return;

    let controller: AbortController | null = null;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const requests: Promise<unknown>[] = [];

      if (friendsOpen) {
        requests.push(refreshFriends(controller.signal));
      }
      if (membersOpen && selectedGroupId) {
        requests.push(getJson<GroupMember[]>(
          `/api/groups/${encodeURIComponent(selectedGroupId)}/members`,
          controller.signal,
        ).then(setMembers));
      }

      void Promise.allSettled(requests).then((results) => {
        for (const result of results) {
          if (result.status === "rejected" &&
            !(result.reason instanceof DOMException && result.reason.name === "AbortError")) {
            console.error("Failed to refresh presence", result.reason);
          }
        }
      });
    };

    refresh();
    const intervalId = window.setInterval(refresh, PRESENCE_POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      controller?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [friendsOpen, membersOpen, refreshFriends, selectedGroupId]);

  const memberIds = useMemo(() => new Set(members.map(({ userId }) => userId)), [members]);
  const sortedFriends = useMemo(
    () => [...friendsData.friends]
      .filter((friend) => friend.username.toLocaleLowerCase().includes(friendsSearch.trim().toLocaleLowerCase()))
      .sort((a, b) => Number(memberIds.has(b.id)) - Number(memberIds.has(a.id))),
    [friendsData.friends, friendsSearch, memberIds],
  );

  async function mutateFriends(
    actionKey: string,
    request: () => Promise<Response>,
    successMessage: string,
  ) {
    setFriendActionKey(actionKey);
    setFriendFeedback(null);
    try {
      const response = await request();
      if (!response.ok) throw new Error(await getErrorMessage(response));
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
      () => fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      }),
      "Friend request sent.",
    );
  }

  function respondToFriendRequest(friend: FriendUser, action: "accept" | "decline") {
    return mutateFriends(
      `respond-${friend.id}`,
      () => fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: friend.id, action }),
      }),
      action === "accept" ? `You are now friends with ${friend.username}.` : "Friend request declined.",
    );
  }

  function cancelFriendRequest(friend: FriendUser) {
    return mutateFriends(
      `cancel-${friend.id}`,
      () => fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: friend.id }),
      }),
      "Friend request cancelled.",
    );
  }

  function removeFriend(friend: FriendUser) {
    return mutateFriends(
      `remove-${friend.id}`,
      () => fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: friend.id }),
      }),
      `${friend.username} was removed from your friends.`,
    );
  }

  return (
    <aside className={`DashboardSidebar ${isOpen ? "DashboardSidebarOpen" : ""}`}>
      <div className="SidebarContent">
        <Accordion value={openSections} onValueChange={setOpenSections} className="SidebarAccordion">
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

            <div className="SidebarAddGroup">
              <Button
                variant="outline"
                className="NewGroupButton"
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
                      selectedGroup?.id === group.id ? "SidebarGroupActive" : ""
                    }`}
                    onClick={() => onSelectGroup(group)}
                  >
                    <span>{group.name}</span>
                  </button>

                  <button
                    type="button"
                    className="SidebarEditButton"
                    aria-label={`Edit ${group.name}`}
                    onClick={(e) => { e.stopPropagation();
                                      setOpenMenu((current) =>
                                    current === `group-${group.id}`
                                    ? null
                                    : `group-${group.id}` ); }}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openMenu === `group-${group.id}` && (
                    <div className="SidebarActionMenu">
                      <button type="button" onClick={() => setOpenMenu(null)}>Rename group</button>
                      <button type="button" onClick={() => setOpenMenu(null)}>Add member</button>
                      <button type="button" onClick={() => setOpenMenu(null)}>Leave group</button>
                      <button type="button" onClick={() => setOpenMenu(null)}>Delete group</button>
                    </div>
                  )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="members" className="SidebarAccordionItem">
            <AccordionTrigger className="SidebarAccordionTrigger"><TechText>Members</TechText></AccordionTrigger>
            <AccordionContent className="SidebarAccordionContent">
              <div className="SidebarFriendList">
                {members.map((member) => (
                  <div key={member.userId} className="SidebarActionRow">
                    <div className="SidebarFriend"><PresenceLight online={member.online} /><span>{member.username}</span></div>
                    <button type="button" className="SidebarEditButton" aria-label={`Actions for ${member.username}`} onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenu((current) => current === `member-${member.userId}` ? null : `member-${member.userId}`);
                    }}><MoreHorizontal size={16} /></button>
                    {openMenu === `member-${member.userId}` ? <div className="SidebarActionMenu">
                      <button type="button" onClick={() => setOpenMenu(null)}>Remove member</button>
                    </div> : null}
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
              <div className="FriendsSidebarActions">
                <Button variant="outline" className="NewFriendButton" onClick={() => {
                  setFriendsManagerOpen(true);
                  void refreshFriends();
                }}>
                  Add friend
                  <Plus size={16} aria-hidden="true" />
                </Button>
                <button type="button" className="FriendsManageButton" onClick={() => {
                  setFriendsManagerOpen(true);
                  void refreshFriends();
                }}>
                  Manage requests
                </button>
              </div>
              <InputBox
                type="search"
                placeholder="Search friends..."
                aria-label="Search friends"
                value={friendsSearch}
                onChange={(event) => setFriendsSearch(event.target.value)}
              />
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
      </div>
    </aside>
  );
}
