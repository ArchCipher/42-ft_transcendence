"use client";

import { Menu } from "@base-ui/react/menu";
import { TechText } from "@/app/components/typography/Typography";
import "./UserMenu.css";
import { useRouter } from "next/navigation";
import { LOGGED_OUT_URL, logoutClient } from "@/lib/auth/session-state";

export default function UserMenu({ username }: {username:string}) {
  const router = useRouter();
  return (
    <div className="UserMenuContainer">
      <Menu.Root modal={false}>
        <Menu.Trigger className="UserMenu" aria-label="Account menu">
		  <span className="UserAvatarInitial" aria-hidden="true">
			{(username.trim().charAt(0) || "?").toUpperCase()}
		  </span>
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
