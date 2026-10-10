import Link from "next/link";
import { TechText, SupportText } from "@/app/components/typography/Typography";

const legalLinks = [["Terms", "/terms"], ["Privacy", "/privacy"], ["Cookies", "/cookies"], ["Accessibility", "/accessibility"]] as const;

export function Footer() {
  return (
    <>
      <footer className="relative z-10 isolate
              flex min-h-15 items-center justify-between gap-8
              border-t border-white/10
              bg-[#020110] mt-auto
              px-[var(--nav-x-padding)] py-4
              text-[#f4f2ee]
              max-sm:min-h-0 max-sm:flex-col max-sm:items-center max-sm:gap-2
              max-sm:py-3">
        <nav aria-label="Legal navigation" className="flex shrink-0 gap-[clamp(1rem,3vw,2.5rem)] max-sm:w-full max-sm:justify-between max-sm:gap-2.5">
          {legalLinks.map(([label, href]) => (
            <Link
              className="whitespace-nowrap text-inherit no-underline hover:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-white max-sm:flex max-sm:min-h-5 max-sm:items-center"
              href={href}
              key={label}
            >
              <TechText className="text-[.68rem] max-sm:tracking-[.03em]">
                {label}
              </TechText>
            </Link>
          ))}
        </nav>
        <p className="shrink-0 whitespace-nowrap">
          <SupportText className="text-[.68rem] max-sm:tracking-normal">
            © {new Date().getFullYear()} SyncText, 42 Berlin.
          </SupportText>
        </p>
      </footer>
    </>
  );
}
