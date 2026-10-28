import { IconHelp, IconSearch } from "@tabler/icons-react";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export function Topbar({
  onOpenCommand,
  onOpenHelp,
}: {
  onOpenCommand: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-[#070915] px-4">
      <OrgSwitcher />
      <button
        onClick={onOpenCommand}
        className="mx-auto flex max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-pink/30 hover:bg-white/[0.04]"
      >
        <IconSearch className="size-3.5" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-border bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <button
        onClick={onOpenHelp}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-pink/30 hover:text-foreground"
      >
        <IconHelp className="size-4" />
      </button>
      <UserMenu />
    </header>
  );
}
