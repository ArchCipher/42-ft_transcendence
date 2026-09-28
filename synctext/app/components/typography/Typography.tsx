import type { ReactNode } from "react";

type TypographyProps = {
  children: ReactNode;
  className?: string;
};

/* Brand / titoli con personalità */
export function DisplayText({ children, className = "" }: TypographyProps) {
  return (
    <span
      className={`font-serif tracking-[-0.055em] text-[#f4f2ee] ${className}`}
    >
      {children}
    </span>
  );
}

/* Linguaggio tecnico / UI */
export function TechText({
  children,
  className = "",
}: TypographyProps) {
  return (
    <span
      className={`font-mono font-bold tracking-[0.08em] ${className}`}
    >
      {children}
    </span>
  );
}

/* Testo secondario / metadata / descrizioni */
export function SupportText({
  children,
  className = "",
}: TypographyProps) {
  return (
    <span
      className={`font-mono tracking-[0.02em] text-white/60 ${className}`}
    >
      {children}
    </span>
  );
}

export function BodyText({
  children,
  className = "",
}: TypographyProps) {
  return (
    <span
      className={`font-mono tracking-[0.01em] text-white/75 ${className}`}
    >
      {children}
    </span>
  );
}