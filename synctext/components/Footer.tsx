import Link from "next/link";
import { TechText, SupportText } from "@/components/Typography";

const legalLinks = [["Terms", "/terms"], ["Privacy", "/privacy"], ["Cookies", "/cookies"], ["Accessibility", "/accessibility"]] as const;

export function Footer() {
  return (
    <>
      <footer className="
              flex min-h-15 items-center justify-between gap-8
              border-t border-white/10
              bg-[#020110] mt-auto
              px-[clamp(1.25rem,5vw,5rem)] py-4
              text-[#f4f2ee]
              max-sm:min-h-0 max-sm:flex-col max-sm:items-stretch
              max-sm:gap-6 max-sm:py-10">
        <nav aria-label="Legal navigation" className="flex flex-wrap gap-[clamp(1rem,3vw,2.5rem)] max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-6 max-sm:gap-y-1">
          {legalLinks.map(([label, href]) => (
            <Link
              className="text-inherit no-underline hover:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-white max-sm:flex max-sm:min-h-11 max-sm:items-center"
              href={href}
              key={label}
            >
              <TechText className="text-[.68rem]">
                {label}
              </TechText>
            </Link>
          ))}
        </nav>
        <p className="max-sm:border-t max-sm:border-white/10 max-sm:pt-6">
          <SupportText className="text-[.68rem]">
            © {new Date().getFullYear()} SyncText, 42 Berlin.
          </SupportText>
        </p>
      </footer>
    </>
  );
}
