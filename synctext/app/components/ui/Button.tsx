import Link from "next/link";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechText } from "@/app/components/typography/Typography";
import styles from "./Button.module.css";

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  href?: string;
  variant?: "primary" | "outline" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  withArrow?: boolean;
  compact?: boolean;
};

export default function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  disabled = false,
  withArrow = false,
  compact = false,
  className = "",
  onClick,
  ...rest
}: ButtonProps) {
  const classes = cn(
    styles.button,
    styles[variant],
    className,
    compact && styles.compact,
  );

  const content = (
    <>
      {variant === "danger" && <TriangleAlert aria-hidden="true" size={14} />}
      <TechText className="text-sm max-[900px]:text-xs">{children}</TechText>
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
	  {...rest}
    >
      {content}
    </button>
  );
}
