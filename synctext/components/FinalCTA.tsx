import Button from "@/components/Button";
import { DisplayText, BodyText } from "@/components/Typography";

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-title" className="flex min-h-80 items-center justify-between gap-8 
                                                          bg-[oklch(0.135_0.012_285)] px-[clamp(1.25rem,5vw,5rem)] 
                                                          py-[clamp(4rem,8vw,7rem)] max-sm:min-h-0 max-sm:flex-col 
                                                          max-sm:items-stretch max-sm:gap-10 max-sm:py-16">
      <div className="max-w-4xl">
        <h2
          className="mb-3 text-[clamp(2.75rem,5.5vw,5.5rem)] leading-[.95] font-normal max-sm:max-w-[10ch]"
          id="final-cta-title"
        >
          <DisplayText>Ready to write, together?</DisplayText>
        </h2>
        <p className="text-[clamp(.78rem,1vw,.9rem)] leading-relaxed">
          <BodyText>
            Open a page. Invite your people. Find the words.
          </BodyText>
        </p>
      </div>
      <div className="max-sm:[&>a]:w-full max-sm:[&>a]:justify-between">
        <Button href="/sync">
          Get writing
        </Button>
      </div>
    </section>
  );
}

