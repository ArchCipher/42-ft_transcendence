"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";

import "./MobileMenu.css";

type MobileMenuProps = {
  children: ReactNode;
};

export default function MobileMenu({ children }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="MobileMenu">
      <button
        type="button"
        className="MobileMenuTrigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open ? (
        <div
          className="MobileMenuPanel"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}