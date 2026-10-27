import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  IconSearch,
  IconLayoutDashboard,
  IconDeviceGamepad2,
  IconBroadcast,
  IconKey,
  IconWebhook,
  IconPlayerPlay,
  IconTrophy,
  IconMedal,
  IconSwords,
  IconList,
  IconChartBar,
  IconUsers,
  IconBuilding,
  IconUser,
  IconLink,
  IconLayout,
  IconPlus,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

type Command = {
  id: string;
  label: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
};

const NAV: { id: string; label: string; section: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", section: "Go to", icon: IconLayoutDashboard },
  { id: "games", label: "Games", section: "Go to", icon: IconDeviceGamepad2 },
  { id: "templates", label: "Templates", section: "Go to", icon: IconLayout },
  { id: "platforms", label: "Platforms", section: "Go to", icon: IconBroadcast },
  { id: "assignments", label: "Assignments", section: "Go to", icon: IconLink },
  { id: "keys", label: "API keys", section: "Go to", icon: IconKey },
  { id: "webhooks", label: "Webhooks", section: "Go to", icon: IconWebhook },
  { id: "sessions", label: "Sessions", section: "Go to", icon: IconPlayerPlay },
  { id: "leaderboards", label: "Leaderboards", section: "Go to", icon: IconTrophy },
  { id: "tournaments", label: "Tournaments", section: "Go to", icon: IconMedal },
  { id: "matches", label: "Matches", section: "Go to", icon: IconSwords },
  { id: "audit", label: "Audit", section: "Go to", icon: IconList },
  { id: "usage", label: "Usage", section: "Go to", icon: IconChartBar },
  { id: "members", label: "Members", section: "Go to", icon: IconUsers },
  { id: "organization", label: "Organization", section: "Go to", icon: IconBuilding },
  { id: "account", label: "Account", section: "Go to", icon: IconUser },
];

const CREATE: { id: string; label: string; section: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "new-game", label: "Create game", section: "Create", icon: IconPlus },
  { id: "new-platform", label: "Create platform", section: "Create", icon: IconPlus },
  { id: "new-tournament", label: "Create tournament", section: "Create", icon: IconPlus },
];

const SETTINGS = new Set(["members", "organization", "account"]);

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { orgSlug } = useParams({ from: "/o/$orgSlug" });
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [open]);

  const commands: Command[] = React.useMemo(() => {
    const goTo: Command[] = NAV.map((item) => ({
      ...item,
      to: `/o/$orgSlug/${SETTINGS.has(item.id) ? `settings/${item.id}` : item.id}`,
    }));

    const create: Command[] = CREATE.map((item) => ({
      ...item,
      to: `/o/$orgSlug/${item.id.replace("new-", "")}/new`,
    }));

    const all = [...goTo, ...create];

    if (!query.trim()) return all;

    const needle = query.toLowerCase();

    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.section.toLowerCase().includes(needle),
    );
  }, [query]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  const go = (command: Command) => {
    const path = command.to.replace("$orgSlug", orgSlug);
    navigate({ to: path as never, params: { orgSlug } as never });
    onOpenChange(false);
  };

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, commands.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const chosen = commands[active];
        if (chosen !== undefined) go(chosen);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const grouped = commands.reduce<Record<string, Command[]>>((acc, command) => {
    (acc[command.section] ??= []).push(command);
    return acc;
  }, {});

  let index = -1;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search pages and actions"
      className="top-[15vh] w-[min(92vw,560px)] translate-y-0 overflow-hidden p-0"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <IconSearch className="size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages and actions…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <kbd className="rounded border border-border bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ESC
        </kbd>
      </div>

      <div className="max-h-[380px] overflow-y-auto p-2">
        {commands.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results.
          </p>
        ) : (
          Object.entries(grouped).map(([section, list]) => (
            <div key={section} className="mb-2 last:mb-0">
              <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {section}
              </p>
              {list.map((command) => {
                index += 1;
                const isActive = index === active;

                return (
                  <button
                    key={command.id}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(command)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-white/[0.06] text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <command.icon className="size-4" />
                    <span>{command.label}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
