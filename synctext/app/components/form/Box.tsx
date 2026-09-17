import type { InputHTMLAttributes } from "react";
import styles from "./Box.module.css";

type BoxProps = InputHTMLAttributes<HTMLInputElement>;

export default function Box({
  className = "",
  ...props
}: BoxProps) {
  return (
    <div className={styles.frame}>
      <input
        {...props}
        className={`${styles.box} ${className}`}
      />
    </div>
  );
}