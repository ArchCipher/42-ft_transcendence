import "./legal.css";
import LegalTOC from "./legal-TOC";
import BrandHeader from "@/components/BrandHeader";
import { Footer } from "@/components/Footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--c-bg)", color: "var(--c-text-muted)" }}
    >
      <a className="skip-link" href="#legal-content">
        Skip to content
      </a>
      <BrandHeader />
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
