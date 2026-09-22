import "./Profile.css";
import ProfileForm from "./profile-form";

import AppBackground from "@/app/components/background/AppBackground";
import Navbar from "@/app/components/navigation/Navbar";
import BrandHeader from "@/app/components/header/BrandHeader";
import AppPanel from "@/app/components/layout/AppPanel";
import { Footer } from "@/app/components/footer/Footer";

export default async function Profile() {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      <div className="ProfilePage">
        <AppPanel className="ProfilePanel">
          <ProfileForm />
        </AppPanel>
      </div>
      <Footer />
    </AppBackground>
  );
}
