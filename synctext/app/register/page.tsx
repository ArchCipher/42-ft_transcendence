import "./Register.css";
import RegisterForm from "./register-form";
import AppBackground from "@/components/AppBackground";

import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import { Footer } from "@/components/Footer";

export default async function Register() {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      <div className="RegisterPage">
        <AppPanel className="RegisterPanel">
          <RegisterForm />
        </AppPanel>
      </div>
      <Footer />
    </AppBackground>
  );
}