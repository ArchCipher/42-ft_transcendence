import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechText } from "@/app/components/typography/Typography";
import styles from "./Button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "outline" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  withArrow?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
};

export default function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  disabled = false,
  withArrow = false,
  compact = false,
  className,
  onClick,
}: ButtonProps) {
  const classes = cn(
    styles.button,
    styles[variant],
    className,
    compact && styles.compact,
  );
  
  const content = (
    <>
        <TechText className={compact ? "text-sm" : "text-xs"}>
          {children}
        </TechText>

      {withArrow && <ArrowUpRight aria-hidden="true" />}
    </>
  );

  if (href?.startsWith("#")) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
