import type { ButtonHTMLAttributes } from "react";
import styles from "./PlusButton.module.css";
import { Plus } from "lucide-react";

type PlusButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "small" | "medium" | "large" | "tile";
};

export default function PlusButton({
  size = "medium",
  className = "",
  ...props
}: PlusButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.plusButton} ${styles[size]} ${className}`}
      {...props}
    >
      <Plus aria-hidden="true" strokeLinecap="butt" strokeLinejoin="miter"/>
    </button>
  );
}