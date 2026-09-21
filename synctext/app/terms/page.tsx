import AppBackground from "@/app/components/background/AppBackground";
import Navbar from "@/app/components/navigation/Navbar";
import BrandHeader from "@/app/components/header/BrandHeader";
import AppPanel from "@/app/components/layout/AppPanel";
import { BodyText } from "@/app/components/typography/Typography";
import { Footer } from "@/app/components/footer/Footer";

export default function TermsPage() {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <AppPanel className="w-full max-w-xl p-8 text-center">
          <BodyText>Terms </BodyText>
          <BodyText className="mt-4">
            Coming soon...
          </BodyText>
        </AppPanel>
      </div>

      <Footer />
    </AppBackground>
  );
}
