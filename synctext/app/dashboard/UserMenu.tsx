"use client";

import { User } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { TechText } from "@/components/Typography";
import "./UserMenu.css";
import { useRouter } from "next/navigation";
import { LOGGED_OUT_URL, logoutClient } from "@/lib/auth/session-state";
import { type UserProps } from "./dashboard-client";

export default function UserMenu({ username }: UserProps) {
  const router = useRouter();
  return (
    <div className="UserMenuContainer">
      <Menu.Root modal={false}>
        <Menu.Trigger className="UserMenu">
          <User size={25} />

          <TechText className="text-xs max-w-[90px] truncate">
            {username}
          </TechText>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner className="UserMenuPositioner">
            <Menu.Popup className="UserDropdown">

              <Menu.Item
                className="UserDropdownItem"
                onClickCapture={() => router.push("/profile")}
              >
                <TechText className="text-xs">
                  Profile
                </TechText>
              </Menu.Item>

              <Menu.Item
                className="UserDropdownItem"
                onClick={() =>
                  void logoutClient(() => router.push(LOGGED_OUT_URL))
                }
              >
                <TechText className="text-xs">Logout</TechText>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
