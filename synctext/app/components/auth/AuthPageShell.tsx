import type { ReactNode } from "react";
import AppBackground from "@/app/components/background/AppBackground";
import AppPanel from "@/app/components/layout/AppPanel";
import { Footer } from "@/app/components/footer/Footer";
import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import Button from "@/app/components/ui/Button";

type AuthPageShellProps = {
  children: ReactNode;
  notice?: ReactNode;
};

export default function AuthPageShell({
  children,
  notice,
}: AuthPageShellProps) {
  return (
    <AppBackground>
      <div className="AuthExperience">
        <Navbar
          brand={<Logo className="AuthNavbarLogo" href="/" />}
          className="AuthNavbar"
        >
          <Button className="AuthNavLink" href="/" variant="outline" compact>
            Home
          </Button>
          <Button className="AuthNavLink" href="/auth" variant="outline" compact>
            Log in
          </Button>
        </Navbar>
        {notice}
        <main className="AuthPage">
          <AppPanel className="AuthPanel">{children}</AppPanel>
        </main>
        <Footer />
      </div>
    </AppBackground>
  );
}
