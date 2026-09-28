import Image from "next/image";
import Button from "@/app/components/ui/Button";
import { DisplayText, BodyText } from "@/app/components/typography/Typography";
import styles from "./HomePage.module.css";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className={styles.hero}
    >
      <div aria-hidden="true" className={styles.heroOrbit}>
        <div className={styles.heroCore}>
          <Image
            alt=""
            className={styles.heroFortyTwo}
            height={225}
            priority
            src="/assets/42-logo-transparent.png"
            width={225}
          />
          <span className={styles.heroPanic}>DON&apos;T PANIC!</span>
        </div>
      </div>
      <div className={styles.heroContent}>
        <p className={styles.heroEyebrow}>A collaborative writing field guide</p>
        <h1
          className={styles.heroTitle}
          id="hero-title"
        >
          <DisplayText>
            Write together.
            <br />
            <em className={styles.heroEmphasis}>
              Stay in sync.
            </em>
          </DisplayText>
        </h1>

        <div className={styles.heroActionRow}>
          <p className={styles.heroCopy}>
            <BodyText className={styles.heroCopyText}>
              A focused writing space where ideas move freely, edits land instantly,
              and every voice stays in the room.
            </BodyText>
          </p>

          <Button href="/sync" withArrow>
            Get writing
          </Button>
        </div>
      </div>
    </section>
  );
}
