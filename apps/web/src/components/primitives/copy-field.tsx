import * as React from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyField({
  value,
  label,
  className,
  monospace = true,
  truncate = false,
}: {
  value: string;
  label?: string;
  className?: string;
  monospace?: boolean;
  truncate?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      )}
      <code
        className={cn(
          "min-w-0 flex-1 rounded-md border border-border bg-white/[0.03] px-2 py-1 text-xs",
          monospace && "font-mono",
          truncate && "truncate",
        )}
      >
        {value}
      </code>
      <button
        onClick={copy}
        className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-pink/40 hover:text-foreground"
        aria-label="Copy"
      >
        {copied ? (
          <IconCheck className="size-3.5 text-emerald-400" />
        ) : (
          <IconCopy className="size-3.5" />
        )}
      </button>
    </div>
  );
}
