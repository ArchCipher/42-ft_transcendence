import type { ReactNode } from "react";
import AppBackground from "@/components/AppBackground";
import AppPanel from "@/components/AppPanel";
import BrandHeader from "@/components/BrandHeader";
import { Footer } from "@/components/Footer";
import Navbar from "@/components/Navbar";

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
