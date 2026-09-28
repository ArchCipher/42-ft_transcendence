"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import UserMenu from "./UserMenu";
import styles from "./Navbar.module.css";
import { TechText } from "../typography/Typography";

export type UserNavbarProps = {
  username: string;
};

export default function UserNavbar({ username }: UserNavbarProps) {
  return (
    <Navbar
      className={styles.navbar}
      brand={<Logo className={styles.navbarLogo} href="/dashboard" />}
      mobileMenu={false}
    >
      <TechText className="min-w-0 max-w-[8rem] truncate text-sm text-[var(--app-text-white)]">{username}</TechText>
      <UserMenu username={username} />
    </Navbar>
  );
}
