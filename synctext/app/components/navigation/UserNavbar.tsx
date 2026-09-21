"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import Button from "@/app/components/ui/Button";
import UserMenu from "./UserMenu";
import styles from "./UserNavbar.module.css";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { TechText } from "../typography/Typography";

export type UserNavbarProps = {
  username: string;
};

export default function UserNavbar({ username }: UserNavbarProps) {
  const pathname = usePathname();
  return (
    <Navbar
      brand={
        <div className="flex items-center gap-3">
          <Logo className={styles.navbarLogo} href="/" />
          {pathname !== "/dashboard" ? (
            <Button
              href="/dashboard"
              variant="outline"
              className={styles.dashboardButton}
              aria-label="Dashboard"
            >
              <Home size={18} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      }
      className={styles.navbar}
      mobileMenu={false}
    >
      <span className={styles.username}>
        <TechText className="text-xs truncate">{username}</TechText>
      </span>
      <UserMenu username={username} />
    </Navbar>
  );
}
