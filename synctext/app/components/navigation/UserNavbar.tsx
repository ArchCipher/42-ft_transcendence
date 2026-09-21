"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import Button from "@/app/components/ui/Button";
import UserMenu from "./UserMenu";
import styles from "./UserNavbar.module.css";
import { usePathname } from "next/navigation";

export type UserNavbarProps = {
  username: string;
};

export default function UserNavbar({ username }: UserNavbarProps) {
  const pathname = usePathname();
  return (
    <Navbar
      brand={<Logo className={styles.navbarLogo} href="/dashboard" />}
      className={styles.navbar}
      mobileMenu={false}
    >
      {pathname !== "/dashboard" ? (
        <Button href="/dashboard" variant="outline" compact>
          Dashboard
        </Button>
      ) : null}
      <UserMenu username={username} />
    </Navbar>
  );
}
