"use client";

import { Menu } from "@base-ui/react/menu";
import { Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import "./NavMenu.css";

type MobileMenuProps = {
  children: ReactNode;
};

export default function MobileMenu({ children }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="NavMenuRoot">
      <Menu.Root modal={false} open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          className="NavMenuTrigger"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X size={20} /> : <MenuIcon size={20} />}
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner className="NavMenuPositioner" align="end">
            <Menu.Popup
              className="NavMenuPanel NavMenuPanel--mobile"
              onClick={() => setOpen(false)}
            >
              {children}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
