"use client";

import { useEffect, useState } from "react";
import styles from "./AppBackground.module.css";

type GalaxyParticlesComponent =
  (typeof import("./GalaxyParticles"))["default"];

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

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

function Galaxy() {
  const [GalaxyParticles, setGalaxyParticles] =
    useState<GalaxyParticlesComponent | null>(null);

  useEffect(() => {
    const idleWindow = window as IdleCallbackWindow;
    const mediaQuery = window.matchMedia(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    );
    let cancelled = false;
    let idleCallbackId: number | undefined;
    let timeoutId: number | undefined;

    const loadParticles = () => {
      void import("./GalaxyParticles").then(({ default: component }) => {
        if (!cancelled && mediaQuery.matches) {
          setGalaxyParticles(() => component);
        }
      });
    };

    const updateGalaxy = () => {
      if (!mediaQuery.matches) {
        setGalaxyParticles(null);
        return;
      }

      if (idleWindow.requestIdleCallback) {
        idleCallbackId = idleWindow.requestIdleCallback(loadParticles, {
          timeout: 1500,
        });
      } else {
        timeoutId = window.setTimeout(loadParticles, 1500);
      }
    };

    updateGalaxy();
    mediaQuery.addEventListener("change", updateGalaxy);

    return () => {
      cancelled = true;
      mediaQuery.removeEventListener("change", updateGalaxy);

      if (idleCallbackId !== undefined) {
        idleWindow.cancelIdleCallback?.(idleCallbackId);
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className={styles.galaxy} aria-hidden="true">
      {GalaxyParticles && <GalaxyParticles />}
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
