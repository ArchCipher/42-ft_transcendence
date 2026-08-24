import "./Login.css";
import Image from "next/image";
import LoginForm from "./login-form";

// NOTICES displayed in navtab
const NOTICES: Record<string, string> = {
  pending: "Verification email sent. Check your inbox..",
  "reset-sent": "Password reset email sent. Check your inbox...",
  "reset-done": "Password reset successful! Log in below...",
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
    <div>
      {verify && NOTICES[verify] && (
        <nav className="NoticeBar">{NOTICES[verify]}</nav>
      )}
      <div className="LoginPage">
        <Header />

        <LoginForm />

        <Image
          src="/assets/humma-kavula.png"
          alt="Humma Kavula"
          width={220}
          height={220}
          className="HummaBanner"
        />
      </div>
    </div>
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
