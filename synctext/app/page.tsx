import type { Metadata } from "next";
import { Features } from "./main-page/features";
import { Hero } from "./main-page/hero";

import AppBackground from "@/app/components/background/AppBackground";
import Navbar from "@/app/components/navigation/Navbar";
import BrandHeader from "@/app/components/header/BrandHeader";
import Button from "@/app/components/ui/Button";
import { Footer } from "@/app/components/footer/Footer";
import { FinalCTA } from "@/app/components/marketing/FinalCTA";

export const metadata: Metadata = { title: "SyncText — Write together, stay in sync", description: "A focused collaborative writing space for real-time editing, contextual comments, and effortless version history." };

export default function MainPage() {
  return <AppBackground>
            <main className="
                            min-h-screen
                            overflow-hidden
                            text-[oklch(0.94_0.012_285)]
                            selection:bg-[oklch(0.72_0.1_290)]
                            selection:text-[oklch(0.12_0.006_285)]">
            <div className="relative z-50">

            <Navbar>
              <Button href="#features" variant="outline">
                Features
              </Button>

              <Button href="/auth" variant="outline">
                Log in
              </Button>

              <Button href="/sync">
                Get writing
              </Button>
            </Navbar>

            </div>

            <div className="relative z-0">
              <BrandHeader />
            </div>

            <Hero />
            <Features />
            <FinalCTA />
            <Footer />
            </main>
          </AppBackground>
}
