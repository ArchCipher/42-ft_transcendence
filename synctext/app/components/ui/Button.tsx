import Link from "next/link";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechText } from "@/app/components/typography/Typography";
import styles from "./Button.module.css";

type CommonProps = {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "danger";
  withArrow?: boolean;
  compact?: boolean;
  className?: string;
};

type ButtonProps = |
        (CommonProps & React.ComponentPropsWithoutRef<"button"> & {
        href?: undefined;}) |
        (CommonProps & React.ComponentPropsWithoutRef<"a"> & {
        href: string;});

export default function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const {
      children,
      href,
      variant = "primary",
      withArrow = false,
      compact = false,
      className = "",
      ...rest
    } = props;

    const classes = cn(
      styles.button,
      styles[variant],
      className,
      compact && styles.compact,
    );

    const content = (
      <>
        {variant === "danger" && (
          <TriangleAlert aria-hidden="true" size={14} />
        )}
        <TechText className="text-sm max-[900px]:text-xs">
          {children}
        </TechText>
        {withArrow && <ArrowUpRight aria-hidden="true" />}
      </>
    );

    if (href.startsWith("#")) {
      return (
        <a href={href} className={classes} {...rest}>
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  const {
    children,
    variant = "primary",
    type = "button",
    disabled = false,
    withArrow = false,
    compact = false,
    className = "",
    ...rest
  } = props;

  const classes = cn(
    styles.button,
    styles[variant],
    className,
    compact && styles.compact,
  );

  const content = (
    <>
      {variant === "danger" && <TriangleAlert aria-hidden="true" size={14} />}
      <TechText className="text-sm max-[900px]:text-xs">
        {children}
      </TechText>
      {withArrow && <ArrowUpRight aria-hidden="true" />}
    </>
  );

  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
}
