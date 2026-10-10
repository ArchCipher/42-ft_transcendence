"use client";

import { Menu } from "@base-ui/react/menu";
import { TechText } from "@/app/components/typography/Typography";
import "./NavMenu.css";
import { useRouter } from "next/navigation";
import { LOGGED_OUT_URL, logoutClient } from "@/lib/auth/session-state";
import Image from "next/image";

type UserMenuProps = {
  username: string;
  avatarUrl: string | null;
};

export function AccountMenuItems() {
  const router = useRouter();
  return (
	<>
	  <Menu.Item
		className="NavMenuItem"
		onClickCapture={() => router.push("/profile")}
	  >
		<TechText className="text-sm max-[900px]:text-xs">Profile</TechText>
	  </Menu.Item>

	  <Menu.Item
		className="NavMenuItem navMenuDanger"
		onClick={() => void logoutClient(() => router.push(LOGGED_OUT_URL))}
	  >
		<TechText className="text-sm max-[900px]:text-xs">Logout</TechText>
	  </Menu.Item>
	</>
  );
}

export default function UserMenu({ username, avatarUrl }: UserMenuProps) {
  return (
    <div className="NavMenuRoot">
      <Menu.Root modal={false}>
        <Menu.Trigger className="UserMenu" aria-label="Account menu">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              fill
              sizes="36px"
              className="UserAvatarImg"
              unoptimized
            />
          ) : (
            <span className="UserAvatarInitial" aria-hidden="true">
              {(username.trim().charAt(0) || "?").toUpperCase()}
            </span>
          )}
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner className="NavMenuPositioner" align="end">
            <Menu.Popup className="NavMenuPanel">
              <AccountMenuItems />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
