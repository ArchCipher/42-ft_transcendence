"use client";

import { ArrowRight, Check, Clock3, MessageSquareText, MousePointer2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DisplayText, TechText, BodyText, SupportText } from "@/components/Typography";

const features = [
  { number: "01", title: "Write in the same moment", description: "See every keystroke as it happens. No refreshing, no conflicts—just a shared page that keeps pace with the room.", detail: "Live collaboration", icon: MousePointer2 },
  { number: "02", title: "Keep feedback in context", description: "Discuss ideas in-line, resolve decisions faster, and keep each conversation exactly where the work is.", detail: "Focused comments", icon: MessageSquareText },
  { number: "03", title: "Never lose a good sentence", description: "Every change is saved automatically. Rewind, review, or restore with complete confidence.", detail: "Complete history", icon: Clock3 },
];

function FeaturePreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div aria-hidden="true" className="relative h-36 overflow-hidden border-y border-white/10 bg-[oklch(0.17_0.01_285)] px-6 py-5">
        <div className="flex items-center gap-2 font-mono text-[.62rem] text-[oklch(0.72_0.018_285)]"><span className="size-2 rounded-full bg-[oklch(0.72_0.12_290)]" />Maya is writing</div>
        <p className="mt-6 max-w-[28ch] font-serif text-lg leading-snug text-[oklch(0.9_0.012_285)]">Ideas get better when the room can think on the same page<span className="ml-0.5 inline-block h-5 w-px translate-y-1 bg-[oklch(0.78_0.12_290)]" /></p>
        <div className="absolute right-5 bottom-4 flex -space-x-2"><span className="grid size-7 place-items-center rounded-full border border-[#111] bg-[oklch(0.68_0.09_30)] font-mono text-[.55rem] text-[#111]">MK</span><span className="grid size-7 place-items-center rounded-full border border-[#111] bg-[oklch(0.75_0.07_200)] font-mono text-[.55rem] text-[#111]">AL</span><span className="grid size-7 place-items-center rounded-full border border-[#111] bg-[oklch(0.76_0.08_95)] font-mono text-[.55rem] text-[#111]">+2</span></div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div aria-hidden="true" className="relative h-36 overflow-hidden border-y border-white/10 bg-[oklch(0.17_0.01_285)] p-5">
        <div className="ml-auto max-w-[18rem] border border-white/12 bg-[oklch(0.2_0.012_285)] p-4">
          <div className="flex items-center justify-between font-mono text-[.6rem] text-[oklch(0.68_0.018_285)]"><span>Alex · just now</span><span>•••</span></div>
          <p className="mt-3 font-mono text-[.68rem] leading-relaxed text-[oklch(0.84_0.012_285)]">Can we make this opening feel more direct?</p>
          <div className="mt-3 flex items-center gap-1 font-mono text-[.58rem] text-[oklch(0.72_0.08_290)]"><Check className="size-3" /> Resolved</div>
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="relative h-36 overflow-hidden border-y border-white/10 bg-[oklch(0.17_0.01_285)] px-6 py-5">
      <div className="absolute top-6 bottom-6 left-8 w-px bg-white/10" />
      {[["Now", "Refined introduction"], ["12 min", "Added research notes"], ["Yesterday", "First complete draft"]].map(([time, label], itemIndex) => (
        <div className="relative mb-3 grid grid-cols-[3.5rem_1fr] items-center gap-3 font-mono text-[.6rem]" key={time}>
          <span className={`relative z-10 size-2 rounded-full ${itemIndex === 0 ? "bg-[oklch(0.75_0.12_290)] ring-4 ring-[oklch(0.23_0.025_285)]" : "bg-[oklch(0.4_0.018_285)]"}`} />
          <p className="-ml-12 grid grid-cols-[3.5rem_1fr] gap-3"><span className="text-[oklch(0.58_0.015_285)]">{time}</span><span className="text-[oklch(0.8_0.012_285)]">{label}</span></p>
        </div>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="relative py-[clamp(6rem,11vw,10rem)]">
      <div className="mb-[clamp(3.5rem,7vw,6rem)] grid grid-cols-[minmax(0,1.4fr)_minmax(17rem,.6fr)] items-end gap-16 px-[clamp(1.25rem,5vw,5rem)] max-md:grid-cols-1 max-md:gap-7">
        <h2 className="max-w-[11ch]
            text-[clamp(3rem,6vw,6.5rem)]
            leading-[.9] font-normal
            max-md:text-[clamp(3rem,14vw,5rem)]"
            id="features-title">
          <DisplayText>
            Made for the way ideas actually happen.
          </DisplayText>
        </h2>
        <p className="max-w-sm text-[clamp(.78rem,1vw,.9rem)] leading-[1.75]">
          <BodyText>
            Thoughtful tools that disappear into the background, so your team can stay with the words.
          </BodyText>
        </p>
      </div>
      <Carousel aria-label="Product features" className="px-[clamp(1.25rem,5vw,5rem)]" opts={{ align: "start" }}>
        <CarouselContent className="ml-0 md:-ml-3 lg:-ml-[10px]">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <CarouselItem className="flex basis-full
                          pl-0
                          md:basis-[56%] md:pl-3
                          lg:basis-1/3 lg:pl-[10px]"
                          key={feature.number}>
              <Card className="group h-full min-h-[30rem] gap-0 rounded-none border border-white/12 bg-[oklch(0.145_0.008_285)] py-0 text-inherit ring-0 transition-[border-color,transform] duration-300 ease-out hover:-translate-y-1 hover:border-white/30 lg:w-full">
                <CardHeader className="flex flex-row items-center justify-between rounded-none p-6">
                  <TechText className="text-[.65rem]">
                    Feature / {feature.number}
                  </TechText>
                  <Icon aria-hidden="true" className="size-4 text-[oklch(0.72_0.04_285)] [stroke-width:1.35]" />
                  </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end p-0 -ml-1">
                  <FeaturePreview index={index} />
                  <div className="px-6 pt-7 pb-8">
                    <CardTitle>
                      <h3 className="max-w-[13ch]
                                      text-[clamp(2rem,3vw,3rem)]
                                      leading-[1.02] font-normal
                                      text-[oklch(0.92_0.012_285)]">
                        <DisplayText>
                          {feature.title}
                        </DisplayText>
                      </h3>
                    </CardTitle>
                    <CardDescription className="mt-4 max-w-[48ch] text-xs leading-[1.75]">
                      <BodyText>
                        {feature.description}
                      </BodyText>
                    </CardDescription>
                  </div>
                </CardContent>
                <CardFooter className=" justify-between
                                        rounded-none border-white/10 bg-transparent
                                        p-6 text-[oklch(0.58_0.015_285)]">
                <TechText className="text-[.65rem]">
                  {feature.detail}
                </TechText>
                <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[oklch(0.82_0.08_290)]" /></CardFooter>
              </Card>
            </CarouselItem>
          );
        })}
        </CarouselContent>
        <div className="mt-8 flex items-center justify-between">
          <p>
          <SupportText className="text-[.62rem] uppercase tracking-[.08em]">
            Drag or use arrows
          </SupportText>
        </p>
          <div aria-label="Feature carousel controls" className="flex gap-2">
            <CarouselPrevious className="static m-0 size-11 translate-none rounded-none border-white/12 bg-transparent text-[oklch(0.82_0.012_285)] hover:border-white/35 hover:bg-white/5 hover:text-[oklch(0.92_0.012_285)] focus-visible:ring-[oklch(0.76_0.1_290)]" />
            <CarouselNext className="static m-0 size-11 translate-none rounded-none border-white/12 bg-transparent text-[oklch(0.82_0.012_285)] hover:border-white/35 hover:bg-white/5 hover:text-[oklch(0.92_0.012_285)] focus-visible:ring-[oklch(0.76_0.1_290)]" />
          </div>
        </div>
      </Carousel>
    </section>
  );
}
