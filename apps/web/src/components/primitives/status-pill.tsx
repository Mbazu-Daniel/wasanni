import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  ready: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  completed: "border-blue/30 bg-blue/10 text-blue",
  running: "border-blue/30 bg-blue/10 text-blue",
  pending_upload: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  extracting: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  pending: "border-border bg-ink/[0.05] text-muted-foreground",
  draft: "border-border bg-ink/[0.05] text-muted-foreground",
  disabled: "border-border bg-ink/[0.05] text-muted-foreground",
  hidden: "border-pink/30 bg-pink/10 text-pink",
  cancelled: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  flagged: "border-pink/30 bg-pink/10 text-pink",
  accepted: "border-border bg-ink/[0.05] text-muted-foreground",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
        styles[status] ?? "border-border bg-ink/[0.05] text-muted-foreground",
      )}
    >
      <span className="size-1 rounded-full bg-current" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
