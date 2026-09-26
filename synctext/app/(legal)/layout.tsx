import "./legal.css";
import LegalTOC from "./legal-TOC";
import { Footer } from "@/app/components/footer/Footer";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import UserNavbar from "../components/navigation/UserNavbar";
import PublicNavbar from "../components/navigation/PublicNavbar";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateSession(await getSessionToken());
  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--c-bg)", color: "var(--c-text-muted)" }}
    >
      <a className="skip-link" href="#legal-content">
        Skip to content
      </a>
      {session?.user ? (
        <UserNavbar username={session.user.username} avatarUrl={session.user.avatarUrl} />
      ) : (
        <PublicNavbar />
      )}
      <div
        className="legal-wrapper"
        style={{
          paddingTop: "4rem",
          paddingBottom: "4rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div className="legal-box">
          <LegalTOC />
          <div className="legal-content" id="legal-content">
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
