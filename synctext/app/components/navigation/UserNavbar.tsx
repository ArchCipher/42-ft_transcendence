"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import UserMenu from "./UserMenu";
import styles from "./Navbar.module.css";
import { TechText } from "../typography/Typography";

type UserNavbarProps = {
  username: string;
  avatarUrl: string | null;
};

export default function UserNavbar({ username, avatarUrl }: UserNavbarProps) {
  return (
    <Navbar
      className={styles.navbar}
      brand={<Logo className={styles.navbarLogo} href="/dashboard" />}
    >
      <TechText className="min-w-0 max-w-[8rem] truncate text-sm text-[var(--app-text-white)]">{username}</TechText>
      <UserMenu username={username} avatarUrl={avatarUrl} />
    </Navbar>
  );
}
