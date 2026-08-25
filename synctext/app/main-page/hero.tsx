"use client";

import Galaxy from "@/components/Galaxy";
import { ButtonLink } from "./navbar";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate min-h-[min(58rem,100svh)] border-b border-white/15 max-sm:min-h-[46rem]">
      <div aria-hidden="true" className="absolute inset-0 -z-20 [&>div]:size-full">
        <Galaxy density={0.8} glowIntensity={0.22} hueShift={225} mouseInteraction mouseRepulsion repulsionStrength={1.2} rotationSpeed={0.035} saturation={0.28} speed={0.65} starSpeed={0.32} transparent twinkleIntensity={0.18} />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,5,.96)_0%,rgba(5,5,5,.69)_46%,rgba(5,5,5,.08)_100%),linear-gradient(0deg,#050505_0%,transparent_28%)] max-sm:bg-[linear-gradient(0deg,#050505_0%,rgba(5,5,5,.7)_45%,rgba(5,5,5,.2)_100%)]" />
      <div className="flex min-h-[min(58rem,100svh)] flex-col justify-center gap-[clamp(2rem,5vh,4.75rem)] px-[clamp(1.25rem,5vw,5rem)] pt-36 pb-24 max-sm:min-h-[46rem] max-sm:justify-end max-sm:pb-26">
        <h1 className="max-w-[12ch] font-serif text-[clamp(4rem,9.3vw,9.5rem)] leading-[.82] font-normal tracking-[-0.065em] max-sm:text-[clamp(3.6rem,17vw,6.5rem)]" id="hero-title">Write together.<br /><em className="font-normal text-[#c8c4d8]">Stay in sync.</em></h1>
        <div className="flex max-w-lg items-end gap-8 max-sm:flex-col max-sm:items-start max-sm:gap-6">
          <p className="flex-1 font-mono text-[clamp(.78rem,1vw,.9rem)] leading-relaxed text-[#aaa9a5]">A focused writing space where ideas move freely, edits land instantly, and every voice stays in the room.</p>
          <ButtonLink href="/sync" withArrow>Get writing</ButtonLink>
        </div>
      </div>
      <p aria-hidden="true" className="absolute right-[clamp(1.25rem,5vw,5rem)] bottom-8 font-mono text-[.65rem] tracking-[.08em] text-[#777] uppercase max-sm:right-auto max-sm:left-5"><span className="ml-2 text-[#f4f2ee]">↓</span></p>
    </section>
  );
}
