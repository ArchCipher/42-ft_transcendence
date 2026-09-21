import type { ReactNode } from "react";
import AppBackground from "@/app/components/background/AppBackground";
import AppPanel from "@/app/components/layout/AppPanel";
import BrandHeader from "@/app/components/header/BrandHeader";
import { Footer } from "@/app/components/footer/Footer";
import Navbar from "@/app/components/navigation/Navbar";

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
      <Navbar />
      <BrandHeader />
      {notice}
      <main className="AuthPage">
        <AppPanel className="AuthPanel">{children}</AppPanel>
      </main>
      <Footer />
    </AppBackground>
  );
}
