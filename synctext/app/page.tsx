import type { Metadata } from "next";
import { Features } from "./main-page/features";
import { Hero } from "./main-page/hero";

import AppBackground from "@/app/components/background/AppBackground";
import Navbar from "@/app/components/navigation/Navbar";
import Logo from "@/app/components/header/Logo";
import Button from "@/app/components/ui/Button";
import { Footer } from "@/app/components/footer/Footer";
import { FinalCTA } from "@/app/components/marketing/FinalCTA";
import styles from "./main-page/HomePage.module.css";

export const metadata: Metadata = { title: "SyncText — Write together, stay in sync", description: "A focused collaborative writing space for real-time editing, contextual comments, and effortless version history." };

export default function MainPage() {
  return <AppBackground>
            <main className={styles.homepage}>
            <div className={styles.navigation}>
            <Navbar
              className={styles.navbar}
              brand={
                <Logo className={styles.navbarLogo} href="/" />
              }
            >
              <Button className={styles.homeOutlineButton} href="#features" variant="outline">
                Features
              </Button>

              <Button className={styles.homeOutlineButton} href="/auth" variant="outline">
                Log in
              </Button>

              <Button className={styles.homePrimaryButton} href="/sync">
                Get writing
              </Button>
            </Navbar>
            </div>

            <Hero />
            <Features />
            <FinalCTA />
            <Footer />
            </main>
          </AppBackground>
}
