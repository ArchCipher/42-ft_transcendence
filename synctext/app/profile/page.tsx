import "./Profile.css";
import ProfileForm from "./profile-form";

import AppBackground from "@/components/AppBackground";
import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import { Footer } from "@/components/Footer";

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