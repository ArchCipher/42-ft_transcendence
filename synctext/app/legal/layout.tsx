import "./legal.css";
import LegalTOC from "./legal-TOC";
// import { Navbar } from "@/app/main-page/navbar";
// import { Footer } from "@/app/main-page/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen" style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
      {/* <Navbar /> */}
      <div
        className="legal-wrapper"
        style={{ paddingTop: "4rem", paddingBottom: "4rem", paddingLeft: "1.5rem", paddingRight: "1.5rem"   }}
      >
        <div className="legal-box">
          <LegalTOC />
          <div className="legal-content">
            {children}
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </main>
  );
}