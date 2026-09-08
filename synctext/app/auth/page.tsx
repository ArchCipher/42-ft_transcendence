import "./Login.css";
import AppBackground from "@/components/AppBackground";
import LoginForm from "./login-form";

import Navbar from "@/components/Navbar";
import BrandHeader from "@/components/BrandHeader";
import AppPanel from "@/components/AppPanel";
import { Footer } from "@/components/Footer";

// NOTICES displayed in navtab
const NOTICES: Record<string, string> = {
  "pending": "Verification email sent. Check your inbox.",
  "reset-sent": "Password reset email sent. Check your inbox.",
  "reset-done": "Password reset successful!",
  "logged-out": "You have been logged out.",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const { verify } = await searchParams;
  return <LoginPage verify={verify} />;
}

function LoginPage({ verify }: { verify?: string }) {
  return (
    <AppBackground>
      <Navbar />
      <BrandHeader />

      {verify && NOTICES[verify] && (
        <div className="NoticeBar" role="status">
          {NOTICES[verify]}
        </div>
      )}

      <div className="LoginPage">
        <AppPanel className="LoginPanel">
          <LoginForm />
        </AppPanel>
      </div>
      <Footer />
    </AppBackground>
  );
}