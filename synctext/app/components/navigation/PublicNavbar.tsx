"use client";

import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import Button from "@/app/components/ui/Button";
import baseStyles from "./Navbar.module.css"
import { usePathname } from "next/navigation";

export default function PublicNavbar() {
  const pathname = usePathname();

  return (
    <Navbar
      className={baseStyles.navbar}
      brand={<Logo className={baseStyles.navbarLogo} href="/" />}
    >
      <Button
        href="/#features"
        variant="outline"
      >
        Features
      </Button>

      {pathname !== "/auth" ?(
      <Button
        href="/auth"
        variant="outline"
      >
        Log in
      </Button>
	  ) : null}

     {(pathname !== "/sync" && !pathname.startsWith("/doc")) ? (
      <Button href="/sync" className="navMenuCTA">
        Get writing
      </Button>) :
	  <Button href="/register" className="navMenuCTA">
        Register
      </Button>}
    </Navbar>
  );
}
