"use client";

import "./DashboardSidebar.css";
import { TechText } from "@/components/Typography";
import PlusButton from "@/components/PlusButton";
import InputBox from "@/components/InputBox";

type DashboardSidebarProps = {
  selectedGroup: {
    id: string;
    name: string;
  } | null;

  onSelectGroup: (
    group: { id: string; name: string } | null
  ) => void;

  isOpen: boolean;
  onClose: () => void;
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
  onClose,
}: DashboardSidebarProps) {

  const selectedMembers = selectedGroup
  ? groupMembers[selectedGroup.id] ?? []
  : [];

  const sortedFriends = [...friends].sort((a, b) => {
    const aMember = selectedMembers.includes(a.id);
    const bMember = selectedMembers.includes(b.id);

    return Number(bMember) - Number(aMember);
  });

  return (
    <aside className={`DashboardSidebar ${ isOpen ? "DashboardSidebarOpen" : ""}`}>

      <div className="SidebarContent">
        <section className="SidebarGroups">
          <div className="SidebarSectionHeader">
          <TechText className="SidebarSectionTitle text-white/80">
            Groups
          </TechText>

          <PlusButton
            size="small"
            aria-label="Create group"
          />
        </div>

        <InputBox
          type="search"
          placeholder="Search groups..."
          aria-label="Search groups"
        />

        <div className="SidebarGroupList">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`SidebarGroup ${
                selectedGroup?.id === group.id ? "SidebarGroupActive" : ""
              }`}
              onClick={() => {
                onSelectGroup(group);
                onClose();
              }}
            >
              {group.name}
            </button>
          ))}
        </div>
        </section>

        <section className="SidebarFriends">
          <div className="SidebarSectionHeader">
          <TechText className="SidebarSectionTitle text-white/80">
            Friends
          </TechText>

          <PlusButton
            size="small"
            aria-label="Add friend"
          />
        </div>

        <InputBox
          type="search"
          placeholder="Search friends..."
          aria-label="Search friends"
        />

        <div className="SidebarFriendList">

          {sortedFriends.map((friend) => {
            const isMember = selectedMembers.includes(friend.id);

            return (
              <div
                key={friend.id}
                className={`SidebarFriend ${
                  isMember ? "SidebarFriendMember" : ""
                }`}
              >
                <span
                  className={`FriendStatus ${
                    friend.online
                      ? "FriendOnline"
                      : "FriendOffline"
                  }`}
                />

                <span>{friend.name}</span>

                {selectedGroup !== null && (
                  <button
                    type="button"
                    className="FriendGroupAction"
                  >
                    {isMember ? "−" : "+"}
                  </button>
                )}
              </div>
            );
          })}

        </div>
        </section>
      </div>

    </aside>
  );
}