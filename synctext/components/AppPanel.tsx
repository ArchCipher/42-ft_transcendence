import type { ReactNode } from "react";

type AppPanelProps = {
  children: ReactNode;
  className?: string;
};

export default function AppPanel({
  children,
  className = "",
}: AppPanelProps) {
  return (
    <div
      className={`
        border border-[#6fd3ff]/20
        bg-[#0A1833]/40
        backdrop-blur-md
        rounded-[10px]
        ${className}
      `}
    >
      {children}
    </div>
  );
}