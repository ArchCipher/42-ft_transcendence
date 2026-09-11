"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";

import "./MobileMenu.css";

type MobileMenuProps = {
  children: ReactNode;
};

export default function MobileMenu({ children }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="MobileMenu" ref={menuRef}>
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