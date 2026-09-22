import type { ReactNode } from "react";
import styles from "./Box.module.css";

type BoxProps = {
  children: ReactNode;
  className?: string;
};

export default function Box({
  children,
  className = "",
}: BoxProps) {
  return (
    <div className={`${styles.frame} ${className}`}>
      <div className={styles.surface}>
        {children}
      </div>
    </div>
  );
}