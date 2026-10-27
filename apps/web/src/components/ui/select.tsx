import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-white/[0.02] px-3 pr-8 text-sm text-foreground transition-colors hover:border-pink/30 focus-visible:border-pink/40 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
        )}
      >
        {value === undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
