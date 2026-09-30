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
        border border-[var(--app-line-dim)]
        bg-[var(--app-panel-bg)]
        backdrop-blur-md
        ${className}
      `}
    >
      {children}
    </div>
  );
}