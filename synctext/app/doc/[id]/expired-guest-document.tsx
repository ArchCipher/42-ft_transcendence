import Button from "@/app/components/ui/Button";
import styles from "@/app/components/ui/Popup.module.css";

export function ExpiredGuestDocument() {
  return (
    <main className="min-h-screen bg-[oklch(0.12_0.006_285)] px-6 font-mono text-[#f4f2ee]">
      <section className={`${styles.popup} text-center`}>
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">
          Temporary document expired
        </p>
        <h1 className={styles.title}>
          This writing session has ended.
        </h1>
        <p className={styles.description}>
          Temporary documents are deleted when their 35-minute session expires.
          Start a new document to keep writing.
        </p>
        <Button href="/sync" className={styles.actionButton} >Start a new document</Button>
      </section>
    </main>
  );
}
