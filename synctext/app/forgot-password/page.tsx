import "./Forgot_password.css";
import ForgotPasswordForm from "./forgot-password-form";

import AppBackground from "@/components/AppBackground";
import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import { Footer } from "@/components/Footer";

export default function ForgotPassword() {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      <div className="FP_Page">
        <AppPanel className="ForgotPasswordPanel">
          <ForgotPasswordForm />
        </AppPanel>
       </div>
      <Footer />
    </AppBackground>
  );
}