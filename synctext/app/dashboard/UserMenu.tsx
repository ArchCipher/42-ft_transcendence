"use client";

import { User } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { TechText } from "@/components/Typography";
import "./UserMenu.css";

type UserMenuProps = {
  username: string;
};

export default function UserMenu({ username }: UserMenuProps) {
  return (
    <div className="UserMenuContainer">
      <Menu.Root modal={false}>
        <Menu.Trigger className="UserMenu">
          <User size={25} />

          <TechText className="text-xs">
            {username}
          </TechText>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="center">
            <Menu.Popup className="UserDropdown">

              <Menu.Item className="UserDropdownItem">
                <TechText className="text-xs">
                  Profile
                </TechText>
              </Menu.Item>

              <Menu.Item className="UserDropdownItem">
                <TechText className="text-xs">
                  Logout
                </TechText>
              </Menu.Item>

            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}