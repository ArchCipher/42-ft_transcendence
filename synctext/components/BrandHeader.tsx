import { TechText, SupportText } from "@/components/Typography";

type BrandHeaderProps = {
  showTagline?: boolean;
};

export default function BrandHeader({
  showTagline = true,
}: BrandHeaderProps) {
  return (
    <section className="relative 
                        z-10 
                        flex 
                        items-start 
                        gap-3 px-5 
                        +py-3 
                        sm:px-[clamp(1.25rem,5vw,5rem)]"
      >
      <div className="font-mono
                      text-[3rem]
                      font-bold
                      leading-[0.85]
                      text-[#6fd3ff]
                      [text-shadow:0_0_10px_rgba(111,211,255,0.35)] ">
        42
      </div>

      <div className="flex flex-col gap-1">
        <TechText className="text-sm text-[#c8c4d8]">
          DON&apos;T PANIC
        </TechText>

        {showTagline && (
          <SupportText className="text-xs">
            All the documents in the universe
          </SupportText>
        )}
      </div>
    </section>
  );
}