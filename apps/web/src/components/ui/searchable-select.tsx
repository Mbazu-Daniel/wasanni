import * as React from "react";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { SelectOption } from "./select";

const initialsOf = (label: string): string => {
  const words = label.trim().split(/\s+/).slice(0, 2);
  const initials = words.map((word) => word.charAt(0)).join("");
  return initials === "" ? "?" : initials.toUpperCase();
};

export function GameAvatar({ label, imageUrl }: { label: string; imageUrl: string | null }) {
  if (imageUrl !== null) {
    return <img src={imageUrl} alt="" className="size-4 shrink-0 rounded-full object-cover" />;
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold uppercase text-muted-foreground">
      {initialsOf(label)}
    </span>
  );
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  compact = false,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((option) => option.value === value);
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const choose = (option: SelectOption): void => {
    if (option.disabled) return;
    onValueChange?.(option.value);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-input bg-ink/[0.04] text-left text-foreground transition-colors hover:border-pink/30 focus-visible:border-pink/40 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
          compact ? "h-7 gap-1 rounded-md px-2 text-[11px]" : "h-9 gap-2 px-3 text-sm",
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-1.5", selected === undefined && "text-muted-foreground")}>
          {selected !== undefined && selected.imageUrl !== undefined && (
            <GameAvatar label={selected.label} imageUrl={selected.imageUrl} />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-1 rounded-lg border border-input bg-card p-1 shadow-lg",
            compact ? "right-0 max-w-72 min-w-48" : "w-full",
          )}
        >
          <div className="flex items-center gap-2 rounded-md border border-input px-2">
            <IconSearch className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
              placeholder="Search…"
              className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-1 max-h-56 overflow-auto" role="listbox">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">No matches</p>
            ) : (
              visibleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-ink/[0.06] disabled:opacity-50",
                    compact ? "text-xs" : "text-sm",
                    option.value === value && "bg-ink/[0.06] font-medium",
                  )}
                >
                  {option.imageUrl !== undefined && (
                    <GameAvatar label={option.label} imageUrl={option.imageUrl} />
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
