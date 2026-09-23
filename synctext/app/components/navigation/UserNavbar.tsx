"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import UserMenu from "./UserMenu";
import styles from "./UserNavbar.module.css";
import { usePathname } from "next/navigation";
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
          <Logo className={styles.navbarLogo} href="/dashboard" />
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
