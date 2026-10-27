import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl border border-border bg-white/[0.03] text-blue-soft">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {(primary || secondary) && (
        <div className="mt-6 flex items-center gap-2">
          {secondary}
          {primary}
        </div>
      )}
    </div>
  );
}
