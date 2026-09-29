"use client";

import "./DashboardSidebar.css";
import { TechText } from "@/app/components/typography/Typography";
import PlusButton from "@/app/components/ui/PlusButton";
import InputBox from "@/app/components/form/InputBox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";

type DashboardSidebarProps = {
  selectedGroup: {
    id: string;
    name: string;
  } | null;

  onSelectGroup: (
    group: { id: string; name: string } | null
  ) => void;

  isOpen: boolean;
};

const groups = [
  { id: "wu", name: "Wu Tang Clan" },
  { id: "42", name: "42 Project" },
  { id: "G", name: "Genesis" },
];

const friends = [
  { id: "alice", name: "Alice", online: true },
  { id: "RZA", name: "RZA", online: true },
  { id: "GZA", name: "GZA", online: false },
  { id: "peter", name: "Peter Gabriel", online: false },
];

const groupMembers: Record<string, string[]> = {
  wu: ["alice", "GZA", "RZA"],
  "42": ["alice"],
  G: ["alice", "peter"],
};

export default function DashboardSidebar({
  selectedGroup,
  onSelectGroup,
  isOpen,
}: DashboardSidebarProps) {

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const selectedMembers = selectedGroup
    ? groupMembers[selectedGroup.id] ?? []
    : [];

  const sortedFriends = [...friends].sort((a, b) => {
    const aMember = selectedMembers.includes(a.id);
    const bMember = selectedMembers.includes(b.id);

    return Number(bMember) - Number(aMember);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (
        !target.closest(".SidebarActionMenu") &&
        !target.closest(".SidebarEditButton")
      ) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <aside className={`DashboardSidebar ${ isOpen ? "DashboardSidebarOpen" : ""}`}>

      <div className="SidebarContent">
        <Accordion
          defaultValue={["groups"]}
          className="SidebarAccordion"
        >
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
              <PlusButton
                size="small"
                aria-label="Create group"
              />
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
          <AccordionTrigger className="SidebarAccordionTrigger">
            <TechText>
              Members
            </TechText>
          </AccordionTrigger>

          <AccordionContent className="SidebarAccordionContent">
            <div className="SidebarFriendList">
              {friends
                .filter((friend) => selectedMembers.includes(friend.id))
                .map((friend) => (
                  <div key={friend.id} className="SidebarActionRow">
                    <div className="SidebarFriend">
                      <span
                        className={`FriendStatus ${
                          friend.online ? "FriendOnline" : "FriendOffline"
                        }`}
                      />
                      <span>{friend.name}</span>
                    </div>

                    <button
                      type="button"
                      className="SidebarEditButton"
                      aria-label={`Actions for ${friend.name}`}
                      onClick={(e) => { e.stopPropagation();
                                        setOpenMenu((current) =>
                                        current === `member-${friend.id}`
                                        ? null
                                        : `member-${friend.id}` ); }}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenu === `member-${friend.id}` && (
                      <div className="SidebarActionMenu">
                        <button type="button" onClick={() => setOpenMenu(null)}>
                          Remove member
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="friends" className="SidebarAccordionItem">
          <AccordionTrigger className="SidebarAccordionTrigger">
            <TechText>
              Friends
            </TechText>
          </AccordionTrigger>

          <AccordionContent className="SidebarAccordionContent">
            <InputBox
              type="search"
              placeholder="Search friends..."
              aria-label="Search friends"
            />

            <div className="SidebarFriendList">
              {sortedFriends.map((friend) => (
                <div key={friend.id} className="SidebarActionRow">
                  <div className="SidebarFriend">
                    <span
                      className={`FriendStatus ${
                        friend.online ? "FriendOnline" : "FriendOffline"
                      }`}
                    />
                    <span>{friend.name}</span>
                  </div>

                  <button
                    type="button"
                    className="SidebarEditButton"
                    aria-label={`Actions for ${friend.name}`}
                    onClick={(e) => { e.stopPropagation();
                                      setOpenMenu((current) =>
                                      current === `friend-${friend.id}`
                                      ? null
                                      : `friend-${friend.id}` ); }}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openMenu === `friend-${friend.id}` && (
                    <div className="SidebarActionMenu">
                      <button type="button" onClick={() => setOpenMenu(null)}>
                        Remove friend
                      </button>
                    </div>
                  )}
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