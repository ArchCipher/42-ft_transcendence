import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type ButtonLinkProps = {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "outline";
  withArrow?: boolean;
};

export function ButtonLink({ children, href, variant = "primary", withArrow = false }: ButtonLinkProps) {
  return (
    <Link className={`inline-flex min-h-11 items-center justify-center gap-3 border px-5 py-3 font-mono text-xs font-medium tracking-tight no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] [&_svg]:size-4 ${variant === "outline" ? "border-white/15 text-[#f4f2ee] hover:border-white/45 hover:bg-white/5" : "border-transparent bg-[#f4f2ee] text-[#090909] hover:bg-white"}`} href={href}>
      {children}
      {withArrow ? <ArrowUpRight aria-hidden="true" data-icon="inline-end" /> : null}
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="absolute top-0 z-10 w-full border-b border-white/15">
      <nav aria-label="Main navigation" className="flex min-h-16 items-center justify-between px-5 sm:min-h-18 sm:px-[clamp(1.25rem,5vw,5rem)]">
        <Link aria-label="SyncText home" className="inline-flex items-start gap-1.5 font-mono text-base tracking-[-0.04em] text-[#f4f2ee] no-underline outline-none focus-visible:ring-2 focus-visible:ring-white" href="/main-page">
          SyncText<span aria-hidden="true" className="text-[0.65em] text-[#8984b5]">↗</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ButtonLink href="/auth" variant="outline">Log in</ButtonLink>
          <ButtonLink href="/sync">Get writing</ButtonLink>
        </div>
      </nav>
    </header>
  );
}
