"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import Button from "@/app/components/ui/Button";
import styles from "./PublicNavbar.module.css";
import { usePathname } from "next/navigation";

export default function PublicNavbar() {
  const pathname = usePathname();

  return (
    <Navbar
      className={styles.navbar}
      brand={<Logo className={styles.navbarLogo} href="/" />}
    >
      <Button
        className={styles.homeOutlineButton}
        href="#features"
        variant="outline"
      >
        Features
      </Button>

      {pathname !== "/auth" ?(
      <Button
        className={styles.homeOutlineButton}
        href="/auth"
        variant="outline"
      >
        Log in
      </Button>
	  ) : null}

      <Button className={styles.homePrimaryButton} href="/sync">
        Get writing
      </Button>
    </Navbar>
  );
}
