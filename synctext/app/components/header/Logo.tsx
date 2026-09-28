import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DisplayText } from "@/app/components/typography/Typography";
import styles from "./Logo.module.css";

type LogoProps = {
  className?: string;
  href?: string;
};

export default function Logo({ className, href }: LogoProps) {
  const lockup = (
    <span className={cn(styles.logo, className)}>
      <DisplayText className={styles.logo}>SyncText</DisplayText>
      <span aria-hidden="true" className={styles.separator}>{"//"}</span>
      <Image
        alt=""
        className={styles.mark}
        height={225}
		loading="eager"
        src="/assets/42-logo-transparent.png"
        width={225}
      />
    </span>
  );

  return href ? (
    <Link aria-label="SyncText home" className={styles.link} href={href}>
      {lockup}
    </Link>
  ) : lockup;
}
