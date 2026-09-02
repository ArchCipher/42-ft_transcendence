import styles from "./AppBackground.module.css";

type AppBackgroundProps = {
  children: React.ReactNode;
};

export default function AppBackground({ children }: AppBackgroundProps) {
  return (
    <div className={styles.background}>
      {children}
    </div>
  );
}