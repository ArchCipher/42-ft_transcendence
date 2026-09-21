import type { InputHTMLAttributes } from "react";
import Box from "./Box";
import styles from "./Field.module.css";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function Field({
  id,
  label,
  error,
  ...inputProps
}: FieldProps) {
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <Box
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
