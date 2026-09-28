import type { InputHTMLAttributes } from "react";
import Box from "@/app/components/form/Box";
import styles from "./InputBox.module.css";

type InputBoxProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: "form" | "inline";
};

export default function InputBox({
  className,
  variant = "form",
  ...props
}: InputBoxProps) {
  const input = (
    <input
      {...props}
      className={[styles.input, className].filter(Boolean).join(" ")}
    />
  );
  if (variant === "inline") return input;
  return <Box>{input}</Box>;
}
