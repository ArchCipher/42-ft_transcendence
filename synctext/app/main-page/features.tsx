"use client";

import { ArrowRight, Clock3, MessageSquareText, MousePointer2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DisplayText, TechText, SupportText } from "@/app/components/typography/Typography";
import styles from "./HomePage.module.css";

const features = [
  { number: "01", title: "Write in the same moment", description: "Your cursors share one page in real time, so the room can move without waiting.", detail: "Live signal", icon: MousePointer2 },
  { number: "02", title: "Keep feedback in context", description: "Leave a signal beside the line it belongs to. Resolve it, and keep the work moving.", detail: "Comment beacon", icon: MessageSquareText },
  { number: "03", title: "Never lose a good sentence", description: "Every draft stays within reach. Compare a moment, rewind it, then carry on.", detail: "Time trace", icon: Clock3 },
];

function FeaturePreview({ index }: { index: number }) {
  if (index === 0) {
    return <div aria-hidden="true" className={`${styles.featureVisual} ${styles.liveVisual}`}>
      <span className={styles.visualOrbit} />
      <span className={`${styles.visualNode} ${styles.nodeOne}`}>M</span>
      <span className={`${styles.visualNode} ${styles.nodeTwo}`}>A</span>
      <span className={styles.liveCursor} />
      <span className={styles.visualCaption}>SIGNAL LOCKED</span>
    </div>;
  }

  if (index === 1) {
    return <div aria-hidden="true" className={`${styles.featureVisual} ${styles.commentVisual}`}>
      <span className={styles.beaconPulse} />
      <span className={styles.beaconCore} />
      <span className={styles.commentLine} />
      <span className={`${styles.commentLine} ${styles.commentLineShort}`} />
      <span className={styles.visualCaption}>CONTEXT FOUND</span>
    </div>;
  }

  return <div aria-hidden="true" className={`${styles.featureVisual} ${styles.historyVisual}`}>
    <span className={styles.timeArc} />
    <span className={`${styles.timePoint} ${styles.timePointOne}`} />
    <span className={`${styles.timePoint} ${styles.timePointTwo}`} />
    <span className={`${styles.timePoint} ${styles.timePointThree}`} />
    <span className={styles.visualCaption}>ALL MOMENTS KEPT</span>
  </div>;
}

export function Features() {
  return <section id="features" aria-labelledby="features-title" className={styles.features}>
    <div className={styles.featuresIntro}>
      <p className={styles.sectionKicker}>01 — ONBOARD SYSTEMS</p>
      <h2 className={styles.featuresTitle} id="features-title">
        <DisplayText>Made for the way ideas actually happen.</DisplayText>
      </h2>
    </div>
    <Carousel aria-label="Product features" className={styles.featureCarousel} opts={{ align: "start" }}>
      <CarouselContent className={styles.carouselContent}>
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return <CarouselItem className={styles.carouselItem} key={feature.number}>
            <Card className={styles.featureCard}>
              <CardHeader className={styles.featureCardHeader}>
                <TechText className="text-[.65rem]">Feature / {feature.number}</TechText>
                <Icon aria-hidden="true" className={styles.featureIcon} />
              </CardHeader>
              <CardContent className={styles.featureCardContent}>
                <FeaturePreview index={index} />
                <div className={styles.featureText}>
                  <CardTitle>
                    <h3 className={styles.featureTitle}><DisplayText>{feature.title}</DisplayText></h3>
                  </CardTitle>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </div>
              </CardContent>
              <CardFooter className={styles.featureCardFooter}>
                <TechText className="text-[.65rem]">{feature.detail}</TechText>
                <ArrowRight aria-hidden="true" className={styles.featureArrow} />
              </CardFooter>
            </Card>
          </CarouselItem>;
        })}
      </CarouselContent>
      <div className={styles.carouselControls}>
        <p><SupportText className={styles.carouselHint}>Drag or use arrows</SupportText></p>
        <div aria-label="Feature carousel controls" className={styles.carouselButtons}>
          <CarouselPrevious className={styles.carouselButton} />
          <CarouselNext className={styles.carouselButton} />
        </div>
      </div>
    </Carousel>
  </section>;
}
