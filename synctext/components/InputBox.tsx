import type { InputHTMLAttributes } from "react";
import Box from "./Box";
import styles from "./InputBox.module.css";

type SearchBoxProps = InputHTMLAttributes<HTMLInputElement>;

export default function SearchBox(props: SearchBoxProps) {
  return (
    <Box>
      <input
        {...props}
        className={styles.input}
      />
    </Box>
  );
}