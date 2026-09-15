import Link from "next/link";
import { GuestStartButton } from "./guest-start-button";

const legalLinks = [["Terms", "/terms"], ["Privacy", "/privacy"], ["Cookies", "/cookies"], ["Accessibility", "/accessibility"]] as const;

export function Footer() {
  return (
    <>
      <section aria-labelledby="final-cta-title" className="flex min-h-80 items-center justify-between gap-8 border-y border-white/12 bg-[oklch(0.135_0.012_285)] px-[clamp(1.25rem,5vw,5rem)] py-[clamp(4rem,8vw,7rem)] max-sm:min-h-0 max-sm:flex-col max-sm:items-stretch max-sm:gap-10 max-sm:py-16">
        <div className="max-w-4xl">
          <h2 className="mb-3 font-serif text-[clamp(2.75rem,5.5vw,5.5rem)] leading-[.95] font-normal tracking-[-0.065em] max-sm:max-w-[10ch]" id="final-cta-title">Ready to write, together?</h2>
          <p className="font-mono text-[clamp(.78rem,1vw,.9rem)] leading-relaxed text-[#aaa9a5]">Open a page. Invite your people. Find the words.</p>
        </div>
        <div className="max-sm:[&>button]:w-full max-sm:[&>button]:justify-between">
          <GuestStartButton withArrow>Get writing</GuestStartButton>
        </div>
      </section>
      <footer className="flex min-h-32 items-center justify-between gap-8 px-[clamp(1.25rem,5vw,5rem)] py-8 font-mono text-[.68rem] text-[#858581] max-sm:min-h-0 max-sm:flex-col max-sm:items-stretch max-sm:gap-6 max-sm:py-10">
        <nav aria-label="Legal navigation" className="flex flex-wrap gap-[clamp(1rem,3vw,2.5rem)] max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-6 max-sm:gap-y-1">
          {legalLinks.map(([label, href]) => (
            <Link className="text-inherit no-underline hover:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-white max-sm:flex max-sm:min-h-11 max-sm:items-center" href={href} key={label}>{label}</Link>
          ))}
        </nav>
        <p className="max-sm:border-t max-sm:border-white/10 max-sm:pt-6">© {new Date().getFullYear()} SyncText, 42 Berlin.</p>
      </footer>
    </>
  );
}
