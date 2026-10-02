"use client";

import "./DashboardSidebar.css";
import { TechText } from "@/app/components/typography/Typography";
import Button from "@/app/components/ui/Button";
import InputBox from "@/app/components/form/InputBox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

type DashboardSidebarProps = {
  selectedGroup: { id: string; name: string } | null;
  onSelectGroup: (group: { id: string; name: string } | null) => void;
  isOpen: boolean;
};

type Group = { id: string; name: string; isPrivateSpace: boolean };
type Friend = { id: string; username: string; online: boolean };
type GroupMember = { userId: string; username: string; online: boolean };

const PRESENCE_POLL_MS = 30_000;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);

  const friendsOpen = openSections.includes("friends");
  const membersOpen = openSections.includes("members");
  const selectedGroupId = selectedGroup?.id ?? null;

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
      const requests: Promise<void>[] = [];

      if (friendsOpen) {
        requests.push(getJson<{ friends: Friend[] }>("/api/friends", controller.signal)
          .then(({ friends: nextFriends }) => setFriends(nextFriends)));
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
  }, [friendsOpen, membersOpen, selectedGroupId]);

  const memberIds = useMemo(() => new Set(members.map(({ userId }) => userId)), [members]);
  const sortedFriends = useMemo(
    () => [...friends].sort((a, b) => Number(memberIds.has(b.id)) - Number(memberIds.has(a.id))),
    [friends, memberIds],
  );

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
            <AccordionTrigger className="SidebarAccordionTrigger"><TechText>Friends</TechText></AccordionTrigger>
            <AccordionContent className="SidebarAccordionContent">
              <InputBox type="search" placeholder="Search friends..." aria-label="Search friends" />
              <div className="SidebarFriendList">
                {sortedFriends.map((friend) => (
                  <div key={friend.id} className="SidebarActionRow">
                    <div className="SidebarFriend"><PresenceLight online={friend.online} /><span>{friend.username}</span></div>
                    <button type="button" className="SidebarEditButton" aria-label={`Actions for ${friend.username}`} onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenu((current) => current === `friend-${friend.id}` ? null : `friend-${friend.id}`);
                    }}><MoreHorizontal size={16} /></button>
                    {openMenu === `friend-${friend.id}` ? <div className="SidebarActionMenu">
                      <button type="button" onClick={() => setOpenMenu(null)}>Remove friend</button>
                    </div> : null}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
