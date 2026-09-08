import "./Password_reset.css";
import { Suspense } from "react";
import PasswordResetForm from "./password-reset-form";

import AppBackground from "@/components/AppBackground";
import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import { Footer } from "@/components/Footer";

export default function PasswordReset() {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      <div className="PasswordResetPage">
        <AppPanel className="PasswordResetPanel">
          <Suspense fallback={null}>
            <PasswordResetForm />
          </Suspense>
        </AppPanel>
      </div>
      <Footer />
    </AppBackground>
  );
}