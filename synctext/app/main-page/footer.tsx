import Link from "next/link";
import { ButtonLink } from "./navbar";

const legalLinks = [["Terms", "/terms"], ["Privacy", "/privacy"], ["Cookies", "/cookies"], ["Accessibility", "/accessibility"]] as const;

export function Footer() {
  return (
    <>
      <section aria-labelledby="final-cta-title" className="flex min-h-80 items-center justify-between gap-8 border-y border-white/12 bg-[oklch(0.135_0.012_285)] px-[clamp(1.25rem,5vw,5rem)] py-[clamp(4rem,8vw,7rem)] max-sm:flex-col max-sm:items-start max-sm:justify-center">
        <div><h2 className="mb-3 font-serif text-[clamp(2.75rem,5.5vw,5.5rem)] leading-[.95] font-normal tracking-[-0.065em]" id="final-cta-title">Ready to write, together?</h2><p className="font-mono text-[clamp(.78rem,1vw,.9rem)] leading-relaxed text-[#aaa9a5]">Open a page. Invite your people. Find the words.</p></div>
        <ButtonLink href="/sync" withArrow>Get writing</ButtonLink>
      </section>
      <footer className="flex min-h-32 items-center justify-between gap-8 px-[clamp(1.25rem,5vw,5rem)] py-8 font-mono text-[.68rem] text-[#858581] max-sm:min-h-40 max-sm:flex-col max-sm:items-start">
        <p>© {new Date().getFullYear()} SyncText, 42 Berlin.</p>
        <nav aria-label="Legal navigation" className="flex flex-wrap gap-[clamp(1rem,3vw,2.5rem)]">{legalLinks.map(([label, href]) => <Link className="text-inherit no-underline hover:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-white" href={href} key={label}>{label}</Link>)}</nav>
      </footer>
    </>
  );
}
