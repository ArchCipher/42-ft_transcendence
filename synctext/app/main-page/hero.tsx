import Button from "@/components/Button";
import { DisplayText, BodyText } from "@/components/Typography";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate min-h-[min(58rem,100svh)] border-b border-white/15 max-sm:min-h-[46rem]"
    >
      <div className="flex min-h-[min(58rem,100svh)] flex-col justify-center gap-[clamp(2rem,5vh,4.75rem)] px-[clamp(1.25rem,5vw,5rem)] pt-36 pb-24 max-sm:min-h-[46rem] max-sm:justify-end max-sm:pb-26">
        <h1
          className="max-w-[12ch] text-[clamp(4rem,9.3vw,9.5rem)] leading-[.82] font-normal max-sm:text-[clamp(3.6rem,17vw,6.5rem)]"
          id="hero-title"
        >
          <DisplayText>
            Write together.
            <br />
            <em className="font-normal text-[#c8c4d8]">
              Stay in sync.
            </em>
          </DisplayText>
        </h1>

        <div className="flex max-w-lg items-end gap-8 max-sm:flex-col max-sm:items-start max-sm:gap-6">
          <p className="flex-1 text-[clamp(.78rem,1vw,.9rem)] leading-relaxed">
            <BodyText>
              A focused writing space where ideas move freely, edits land instantly,
              and every voice stays in the room.
            </BodyText>
          </p>

          <Button href="/sync">
            Get writing
          </Button>
        </div>
      </div>
    </section>
  );
}