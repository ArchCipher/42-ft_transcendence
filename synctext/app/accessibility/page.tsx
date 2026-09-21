import AppBackground from "@/components/AppBackground";
import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import { BodyText } from "@/components/Typography";
import { Footer } from "@/components/Footer";

export default function AccessibilityPage() {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <AppPanel className="w-full max-w-xl p-8 text-center">
          <BodyText>Accessibility </BodyText>
          <BodyText className="mt-4">
            Coming soon...
          </BodyText>
        </AppPanel>
      </div>

      <Footer />
    </AppBackground>
  );
}