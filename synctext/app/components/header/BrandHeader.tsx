import Link from "next/link";
import { DisplayText, TechText, SupportText } from "@/app/components/typography/Typography";

type BrandHeaderProps = {
  showTagline?: boolean;
  className?: string;
};

export default function BrandHeader({
  showTagline = true,
  className = "",
}: BrandHeaderProps) {
  return (
    <section
      className={`relative px-5
                 pt-1 pb-2 -mt-18
                 sm:px-[clamp(1.25rem,5vw,5rem)]
                 z-[60] pointer-events-none ${className}`}
    >
      <Link
        href="/"
        aria-label="SyncText home"
        className="leading-none no-underline"
      >
        <DisplayText
          className="inline-block
                    text-[3.6rem]
                    leading-none
                    text-[#f4f2ee]
                    translate-x-[16px]
                    scale-x-[1.2]
                    pointer-events-auto"
        >
          SyncText
        </DisplayText>
      </Link>

      <div className="flex items-center gap-3">
        <div
          className="font-mono
                     text-[2rem]
                     font-bold
                     leading-[0.85]
                     text-[#6fd3ff] scale-x-[1.3] translate-x-[4px] translate-y-[12px]
                     [text-shadow:0_0_10px_rgba(111,211,255,0.35)]"
        >
          42
        </div>
        <TechText className="text-sm text-[#c8c4d8]
                  [word-spacing:-1px] translate-x-[52px] translate-y-[18px] scale-x-[1.6]">
          DON&apos;T PANIC!
        </TechText>
      </div>

      {showTagline && (
        <SupportText className="inline-block mt-1 text-xs translate-y-[10px]">
          All the documents in the universe
        </SupportText>
      )}
    </section>
  );
}
