"use client";

import { useEffect, useState } from "react";
import styles from "./AppBackground.module.css";

function deterministicRandom(seed: number) {
  let x = seed | 0;

  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);

  return (x >>> 0) / 4294967296;
}

function Stars() {
  const layerClasses = [
    styles.starLayerFar,
    styles.starLayerMid,
    styles.starLayerNear,
  ];

  const amounts = [160, 90, 30];

  return (
    <div className={styles.starField} aria-hidden="true">
      {amounts.map((amount, layer) => (
        <div key={layer} className={layerClasses[layer]}>
          {Array.from({ length: amount }, (_, i) => {
            const seed = layer * 10000 + i * 7;

            const size =
              layer === 0
                ? 0.3 + deterministicRandom(seed + 3) * 0.6
                : layer === 1
                  ? 0.5 + deterministicRandom(seed + 3) * 0.8
                  : 0.8 + deterministicRandom(seed + 3) * 1.1;

            return (
              <span
                key={i}
                className={styles.star}
                style={{
                  left: `${deterministicRandom(seed + 1) * 100}%`,
                  top: `${deterministicRandom(seed + 2) * 100}%`,
                  width: size,
                  height: size,
                  opacity:
                    0.2 + deterministicRandom(seed + 4) * 0.7,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Comet() {
  return (
    <div className={styles.comet} aria-hidden="true">
      <div className={styles.cometTail} />
      <div className={styles.cometHead} />
    </div>
  );
}

type AppBackgroundProps = {
  children: React.ReactNode;
};

const SPARKLES = [
  { x: 17, y: 31, size: 2.2, duration: 8.2, delay: 1.3, glow: 0.35 },
  { x: 39, y: 67, size: 3, duration: 11.5, delay: 4.7, glow: 0.45 },
  { x: 61, y: 24, size: 2, duration: 7.1, delay: 2.2, glow: 0.30 },
  { x: 79, y: 49, size: 2.6, duration: 13.4, delay: 6.1, glow: 0.40 },

  { x: 52, y: 42, size: 1.7, duration: 15.2, delay: 3.8, glow: 1 },

  { x: 9, y: 63, size: 2.2, duration: 16.1, delay: 2.7, glow: 0.60 },
  { x: 95, y: 30, size: 1.7, duration: 10.7, delay: 7.1, glow: 0.50 },
  { x: 93, y: 80, size: 1.6, duration: 11.3, delay: 0.8, glow: 0.42 },
  { x: 12, y: 88, size: 2.3, duration: 7.4, delay: 5.7, glow: 0.80 },
  { x: 88, y: 12, size: 1.8, duration: 6.3, delay: 1.9, glow: 0.70 },
];

function Sparkles() {
  return (
    <div className={styles.sparkleField} aria-hidden="true">
      {SPARKLES.map((star, index) => (
        <span
          key={index}
          className={styles.sparkle}
          style={{
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,

          boxShadow: `
            0 0 ${2 + star.glow * 4}px rgba(255, 255, 255, ${0.3 + star.glow * 0.7}),
            0 0 ${5 + star.glow * 8}px rgba(170, 210, 255, ${star.glow * 0.4})
          `,

          animationDuration: `${star.duration}s`,
          animationDelay: `-${star.delay}s`,
        }}
        />
      ))}
    </div>
  );
}

const GALAXY_COLORS = [
  "#ffffff",
  "#f5eaff",
  "#d87cff",
  "#ff4fb8",
  "#ff6470",
  "#9f6cff",
];

function Galaxy() {
  const particles = Array.from({ length: 350 }, (_, i) => {
    const t = deterministicRandom(i * 11 + 1);

    // più particelle concentrate verso il centro
    const radius = Math.pow(t, 1.7) * 40;

    // 3 bracci principali
    const arm = i % 3;

    const angle =
    arm * ((Math.PI * 2) / 3) +
    t * Math.PI * 5 +
    (deterministicRandom(i * 11 + 2) - 0.5) * 0.2;

    const spread =
      (deterministicRandom(i * 11 + 3) - 0.5) *
      (3 + radius * 0.15);

    const rawX =
      50 +
      Math.cos(angle) * radius * 1.25 +
      spread;

    const rawY =
      50 +
      Math.sin(angle) * radius * 0.62 +
      spread * 0.4;

    const x = Number(rawX.toFixed(3));
    const y = Number(rawY.toFixed(3));

    const centerStrength = 1 - radius / 48;

    const size = Number(
      (
        0.5 +
        deterministicRandom(i * 11 + 4) * 1.8 +
        centerStrength * 0.8
      ).toFixed(3)
    );

    const opacity = Number(
      (
        0.25 +
        deterministicRandom(i * 11 + 5) * 0.55 +
        centerStrength * 0.2
      ).toFixed(3)
    );

    return {
      id: i,
      x,
      y,
      size,
      opacity,
      color:
        GALAXY_COLORS[
          Math.floor(
            deterministicRandom(i * 11 + 6) *
              GALAXY_COLORS.length
          )
        ],
    };
  });

  return (
    <div className={styles.galaxy} aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={styles.galaxyParticle}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            backgroundColor: particle.color,
          }}
        />
      ))}
      <div className={styles.galaxyCore} />
    </div>
  );
}

export default function AppBackground({ children }: AppBackgroundProps) {
  const [showComet, setShowComet] = useState(false);

  useEffect(() => {
    const launchComet = () => {
      setShowComet(true);

      setTimeout(() => {
        setShowComet(false);
      }, 8500);
    };

    const firstComet = setTimeout(launchComet, 4000);
    const interval = setInterval(launchComet, 30000);

    return () => {
      clearTimeout(firstComet);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={styles.background}>
      <div className={styles.nebula} aria-hidden="true" />

      <Galaxy />
      <Stars />
      <Sparkles />

      {showComet && <Comet />}

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}