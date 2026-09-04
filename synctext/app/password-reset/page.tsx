import "./Password_reset.css";
import { Suspense } from "react";
import PasswordResetForm from "./password-reset-form";
import AppBackground from "@/components/AppBackground";

export default function PasswordReset() {
  return (
    <AppBackground>
      <div className="PasswordResetPage">
        <Header />
        <Suspense fallback={null}>
          <PasswordResetForm />
        </Suspense>
      </div>
    </AppBackground>
  );
}

function Header() {
  return (
    <header className="Header">
      <div className="Brand">
        <div className="BrandNumber">42</div>

        <div className="BrandText">
          <h1>DON&apos;T PANIC</h1>
          <p>All the documents in the universe</p>
        </div>
      </div>
    </header>
  );
}

