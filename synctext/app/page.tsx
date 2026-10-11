import type { Metadata } from "next";
import { Features } from "./main-page/features";
import { Hero } from "./main-page/hero";

import AppBackground from "@/app/components/background/AppBackground";
import { Footer } from "@/app/components/footer/Footer";
import { FinalCTA } from "@/app/components/marketing/FinalCTA";
import styles from "./main-page/HomePage.module.css";
import PublicNavbar from "./components/navigation/PublicNavbar";
import { getCurrentDocumentActor } from "@/lib/documents/access";
import UserNavbar from "./components/navigation/UserNavbar";

export const metadata: Metadata = {
  title: { absolute: "SyncText — Write together, stay in sync" },
  description:
    "A focused collaborative writing space for real-time editing, contextual comments, and effortless version history.",
};

export default async function MainPage() {
  const actor = await getCurrentDocumentActor();
  return (
    <AppBackground>
      <main className={styles.homepage}>

        <div className={styles.navigation}>
          {actor?.kind == "user" ? (
            <UserNavbar username={actor.username} avatarUrl={actor.avatarUrl} />
          ) : (
            <PublicNavbar />
          )}
        </div>

        <Hero />
        <Features />
        <FinalCTA />
      </main>
      <Footer />
    </AppBackground>
  );
}
