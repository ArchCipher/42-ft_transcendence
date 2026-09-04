import "./Login.css";
import AppBackground from "../../components/AppBackground";
import LoginForm from "./login-form";

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
      {verify && NOTICES[verify] && (
        <nav className="NoticeBar">{NOTICES[verify]}</nav>
      )}

      <div className="LoginPage">
        <Header />
        <LoginForm />
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
