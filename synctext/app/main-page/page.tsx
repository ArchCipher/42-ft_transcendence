import type { Metadata } from "next";

import { Features } from "./features";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { Navbar } from "./navbar";

export const metadata: Metadata = {
  title: "SyncText — Write together, stay in sync",
  description:
    "A focused collaborative writing space for real-time editing, contextual comments, and effortless version history.",
};

export default function MainPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[oklch(0.12_0.006_285)] font-mono text-[oklch(0.94_0.012_285)] selection:bg-[oklch(0.72_0.1_290)] selection:text-[oklch(0.12_0.006_285)]">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
