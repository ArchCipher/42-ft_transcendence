import Button from "@/app/components/ui/Button";
import { DisplayText, BodyText } from "@/app/components/typography/Typography";
import styles from "@/app/main-page/HomePage.module.css";

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-title" className={styles.finalCta}>
      <div className={styles.finalCtaCopy}>
        <p className={styles.sectionKicker}>END OF TRANSMISSION?</p>
        <h2
          className={styles.finalCtaTitle}
          id="final-cta-title"
        >
          <DisplayText>Ready to write, together?</DisplayText>
        </h2>
        <p className={styles.finalCtaText}>
          <BodyText>
            Open a page. Invite your people. Find the words.
          </BodyText>
        </p>
      </div>
      <div className={styles.finalCtaAction}>
        <Button href="/sync" withArrow>
          Get writing
        </Button>
      </div>
    </section>
  );
}
