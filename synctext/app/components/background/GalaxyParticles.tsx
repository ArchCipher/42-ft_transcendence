"use client";

import { useSyncExternalStore } from "react";
import styles from "./AppBackground.module.css";

const GALAXY_COLORS = [
  "#ffffff",
  "#f5eaff",
  "#d87cff",
  "#ff4fb8",
  "#ff6470",
  "#9f6cff",
];

function deterministicRandom(seed: number) {
  let x = seed | 0;

  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);

  return (x >>> 0) / 4294967296;
}

const PARTICLES = Array.from({ length: 350 }, (_, id) => {
  const t = deterministicRandom(id * 11 + 1);
  const radius = Math.pow(t, 1.7) * 40;
  const arm = id % 3;
  const angle =
    arm * ((Math.PI * 2) / 3) +
    t * Math.PI * 5 +
    (deterministicRandom(id * 11 + 2) - 0.5) * 0.2;
  const spread =
    (deterministicRandom(id * 11 + 3) - 0.5) * (3 + radius * 0.15);
  const x = Number((50 + Math.cos(angle) * radius * 1.25 + spread).toFixed(3));
  const y = Number(
    (50 + Math.sin(angle) * radius * 0.62 + spread * 0.4).toFixed(3),
  );
  const centerStrength = 1 - radius / 48;

  return {
    id,
    x,
    y,
    size: Number(
      (0.5 + deterministicRandom(id * 11 + 4) * 1.8 + centerStrength * 0.8).toFixed(
        3,
      ),
    ),
    opacity: Number(
      (0.25 + deterministicRandom(id * 11 + 5) * 0.55 + centerStrength * 0.2).toFixed(
        3,
      ),
    ),
    color:
      GALAXY_COLORS[
        Math.floor(deterministicRandom(id * 11 + 6) * GALAXY_COLORS.length)
      ],
  };
});

const WIDE_SCREEN_QUERY = "(min-width: 1920px)";

function subscribeToWideScreenChange(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(WIDE_SCREEN_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function isWideScreen() {
  return window.matchMedia(WIDE_SCREEN_QUERY).matches;
}

export default function GalaxyParticles() {
  const reduceParticleDensity = useSyncExternalStore(
    subscribeToWideScreenChange,
    isWideScreen,
    () => false,
  );
  const particles = reduceParticleDensity ? PARTICLES.slice(0, 200) : PARTICLES;

  return (
    <div className={styles.galaxyParticles}>
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
    </div>
  );
}
