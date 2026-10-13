"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import "./ActionMenu.css";

export type ActionItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

type ActionMenuProps = {
  label: string;
  items: ActionItem[];
  className?: string;
};

// A "…" button and its dropdown; renders nothing without actions. Not modal, and
// focus stays where the action put it (an inline input, a dialog).
export default function ActionMenu({ label, items, className }: ActionMenuProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={className} aria-label={label}>
        <MoreVertical size={16} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="ActionMenuContent"
          align="end"
          sideOffset={4}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              className={`ActionMenuItem ${item.danger ? "ActionMenuDanger" : ""}`}
              onSelect={item.onSelect}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
