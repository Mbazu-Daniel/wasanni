import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "muted",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "muted" | "default" | "blue" | "success" | "warning";
}) {
  const variants = {
    muted: "border-border bg-ink/[0.05] text-muted-foreground",
    default: "border-pink/30 bg-pink/10 text-pink",
    blue: "border-blue/30 bg-blue/10 text-blue",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
