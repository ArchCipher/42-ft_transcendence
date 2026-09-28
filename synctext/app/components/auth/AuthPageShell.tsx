import type { ReactNode } from "react";
import "@/app/auth/auth.css";
import AppBackground from "@/app/components/background/AppBackground";
import AppPanel from "@/app/components/layout/AppPanel";
import { Footer } from "@/app/components/footer/Footer";
import { cn } from "@/lib/utils";
import PublicNavbar from "../navigation/PublicNavbar";

type AuthPageShellProps = {
  children: ReactNode;
  notice?: ReactNode;
  navbar?: ReactNode;
  panelClassName?: string;
};

export default function AuthPageShell({
  children,
  notice,
  navbar = <PublicNavbar />,
  panelClassName,
}: AuthPageShellProps) {
  return (
    <AppBackground>
      <div className="AuthExperience">
        {navbar}
        {notice}
        <main className="AuthPage">
          <AppPanel className={cn("AuthPanel", panelClassName)}>
            {children}
          </AppPanel>
        </main>
        <Footer />
      </div>
    </AppBackground>
  );
}
