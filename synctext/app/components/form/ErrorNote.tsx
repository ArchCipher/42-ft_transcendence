import { TriangleAlert } from "lucide-react";
import styles from "./ErrorNote.module.css";

type ErrorNoteProps = { children: React.ReactNode; id?: string };

export default function ErrorNote({ children, id }: ErrorNoteProps) {
  return (
    <p id={id} className={styles.errorNote} role="alert">
      <TriangleAlert aria-hidden="true" size={12} />
      <span>{children}</span>
    </p>
  );
}
