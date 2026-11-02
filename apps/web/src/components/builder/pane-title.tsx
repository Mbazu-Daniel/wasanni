import type { ReactNode } from "react";

export function PaneTitle({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-launch-ink/68">
      {children}
    </p>
  );
}
