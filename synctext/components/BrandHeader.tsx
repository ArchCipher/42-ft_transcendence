import { TechText, SupportText } from "@/components/Typography";

type BrandHeaderProps = {
  showTagline?: boolean;
};

export default function BrandHeader({
  showTagline = true,
}: BrandHeaderProps) {
  return (
    <section
      className="relative
                 z-10
                 px-5
                 pt-1 pb-2
                 sm:px-[clamp(1.25rem,5vw,5rem)]"
    >
      <div className="flex items-center gap-3">
        <div
          className="font-mono
                     text-[2rem]
                     font-bold
                     leading-[0.85]
                     text-[#6fd3ff]
                     [text-shadow:0_0_10px_rgba(111,211,255,0.35)]"
        >
          42
        </div>

        <TechText className="text-sm text-[#c8c4d8]">
          DON&apos;T PANIC
        </TechText>
      </div>

      {showTagline && (
        <SupportText className="mt-1 text-xs">
          All the documents in the universe
        </SupportText>
      )}
    </section>
  );
}