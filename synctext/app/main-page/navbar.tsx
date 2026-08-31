import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "outline";
  withArrow?: boolean;
};

export function ButtonLink({ children, href, variant = "primary", withArrow = false }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant: variant === "outline" ? "outline" : "default", size: "lg" }), "min-h-11 rounded-none px-5 font-mono text-xs tracking-tight focus-visible:ring-white/50", variant === "outline" ? "border-white/15 bg-transparent text-[#f4f2ee] hover:border-white/45 hover:bg-white/5 hover:text-[#f4f2ee]" : "bg-[#f4f2ee] text-[#090909] hover:bg-white")} href={href}>
      {children}
      {withArrow ? <ArrowUpRight aria-hidden="true" data-icon="inline-end" /> : null}
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="absolute top-0 z-10 w-full border-b border-white/15">
      <nav aria-label="Main navigation" className="flex min-h-16 items-center justify-between px-5 sm:min-h-18 sm:px-[clamp(1.25rem,5vw,5rem)]">
        <Link aria-label="SyncText home" className="inline-flex items-start gap-1.5 font-mono text-base tracking-[-0.04em] text-[#f4f2ee] no-underline outline-none focus-visible:ring-2 focus-visible:ring-white" href="/">
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
