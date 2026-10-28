import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-border bg-white/[0.06] transition-colors checked:border-pink/60 checked:bg-pink/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </label>
  );
}
