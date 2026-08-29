"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "./navbar";

const Galaxy = dynamic(() => import("@/components/Galaxy"), { ssr: false });

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);
    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || hasEnteredViewport || isMobile || prefersReducedMotion) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEnteredViewport(true);
        observer.disconnect();
      }
    });

    observer.observe(section);
    return () => observer.disconnect();
  }, [hasEnteredViewport, isMobile, prefersReducedMotion]);

  const showGalaxy = hasEnteredViewport && !isMobile && !prefersReducedMotion;

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative isolate min-h-[min(58rem,100svh)] border-b border-white/15 [contain:layout_paint] max-sm:min-h-[46rem]">
      <div aria-hidden="true" className="absolute inset-0 -z-20 [&>div]:size-full">
        {showGalaxy ? (
          <Galaxy density={0.8} glowIntensity={0.22} hueShift={225} mouseInteraction mouseRepulsion repulsionStrength={1.2} rotationSpeed={0.035} saturation={0.28} speed={0.65} starSpeed={0.32} transparent twinkleIntensity={0.18} />
        ) : (
          <div className="size-full bg-[radial-gradient(ellipse_at_72%_36%,rgba(89,76,145,.32),transparent_42%),radial-gradient(ellipse_at_85%_18%,rgba(200,196,216,.12),transparent_28%)]" />
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,5,.96)_0%,rgba(5,5,5,.69)_46%,rgba(5,5,5,.08)_100%),linear-gradient(0deg,#050505_0%,transparent_28%)] max-sm:bg-[linear-gradient(0deg,#050505_0%,rgba(5,5,5,.7)_45%,rgba(5,5,5,.2)_100%)]" />
      <div className="flex min-h-[min(58rem,100svh)] flex-col justify-center gap-[clamp(2rem,5vh,4.75rem)] px-[clamp(1.25rem,5vw,5rem)] pt-36 pb-24 max-sm:min-h-[46rem] max-sm:justify-end max-sm:pb-26">
        <h1 className="max-w-[12ch] font-serif text-[clamp(4rem,9.3vw,9.5rem)] leading-[.82] font-normal tracking-[-0.065em] max-sm:text-[clamp(3.6rem,17vw,6.5rem)]" id="hero-title">Write together.<br /><em className="font-normal text-[#c8c4d8]">Stay in sync.</em></h1>
        <div className="flex max-w-lg items-end gap-8 max-sm:flex-col max-sm:items-start max-sm:gap-6">
          <p className="flex-1 font-mono text-[clamp(.78rem,1vw,.9rem)] leading-relaxed text-[#aaa9a5]">A focused writing space where ideas move freely, edits land instantly, and every voice stays in the room.</p>
          <ButtonLink href="/sync" withArrow>Get writing</ButtonLink>
        </div>
      </div>
    </section>
  );
}
