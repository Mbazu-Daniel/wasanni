import * as React from "react";
import {
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconBook,
  IconBroadcast,
  IconBuilding,
  IconCheck,
  IconCode,
  IconCopy,
  IconDeviceGamepad2,
  IconKey,
  IconLayout,
  IconLayoutDashboard,
  IconLink,
  IconList,
  IconChartBar,
  IconLogout,
  IconMedal,
  IconAlertTriangle,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSwords,
  IconUser,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { PAGE_SHORTCUTS } from "./keyboard-shortcuts";

type Icon = React.ComponentType<{ className?: string }>;

type Command = {
  id: string;
  label: string;
  section: "Go to" | "Create" | "Actions";
  icon: Icon;
  to?: string;
  action?: () => void | Promise<void>;
  shortcut?: string;
};

const NAV: { id: string; label: string; icon: Icon }[] = [
  { id: "overview", label: "Overview", icon: IconLayoutDashboard },
  { id: "games", label: "Games", icon: IconDeviceGamepad2 },
  { id: "templates", label: "Templates", icon: IconLayout },
  { id: "platforms", label: "Platforms", icon: IconBroadcast },
  { id: "assignments", label: "Assignments", icon: IconLink },
  { id: "keys", label: "API keys", icon: IconKey },
  { id: "webhooks", label: "Webhooks", icon: IconWebhook },
  { id: "tournaments", label: "Tournaments", icon: IconMedal },
  { id: "matches", label: "Matches", icon: IconSwords },
  { id: "audit", label: "Audit", icon: IconList },
  { id: "usage", label: "Usage", icon: IconChartBar },
  { id: "developer", label: "Developer", icon: IconCode },
  { id: "members", label: "Members", icon: IconUsers },
  { id: "organization", label: "Organization", icon: IconBuilding },
  { id: "account", label: "Account", icon: IconUser },
  { id: "danger", label: "Danger zone", icon: IconAlertTriangle },
];

const SETTINGS = new Set(["members", "organization", "account", "danger"]);

const CREATE: { id: string; label: string; to: string }[] = [
  { id: "new-game", label: "New game", to: "games/new" },
  { id: "new-template", label: "New template", to: "templates/new" },
  { id: "new-platform", label: "New platform", to: "platforms/new" },
  { id: "new-tournament", label: "New tournament", to: "tournaments/new" },
  { id: "new-match", label: "New match", to: "matches/new" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { orgSlug } = useParams({ from: "/o/$orgSlug" });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const queryClient = useQueryClient();

  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      setCopied(false);
      return;
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [open]);

  const commands = React.useMemo<Command[]>(() => {
    const goTo: Command[] = NAV.map((item) => ({
      id: item.id,
      label: item.label,
      section: "Go to",
      icon: item.icon,
      to: `/o/$orgSlug/${SETTINGS.has(item.id) ? `settings/${item.id}` : item.id}`,
      shortcut:
        PAGE_SHORTCUTS[item.id] === undefined
          ? undefined
          : `g ${PAGE_SHORTCUTS[item.id]}`,
    }));

    const create: Command[] = CREATE.map((item) => ({
      id: item.id,
      label: item.label,
      section: "Create",
      icon: IconPlus,
      to: `/o/$orgSlug/${item.to}`,
    }));

    const actions: Command[] = [
      {
        id: "copy-url",
        label: copied ? "Copied current URL" : "Copy current URL",
        section: "Actions",
        icon: copied ? IconCheck : IconCopy,
        action: async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success("URL copied");
            setTimeout(() => setCopied(false), 1600);
          } catch {
            toast.error("Could not copy");
          }
        },
      },
      {
        id: "refresh",
        label: "Refresh data",
        section: "Actions",
        icon: IconRefresh,
        action: async () => {
          await queryClient.invalidateQueries();
          onOpenChange(false);
        },
      },
      {
        id: "docs",
        label: "Open API docs",
        section: "Actions",
        icon: IconBook,
        action: () => {
          const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:9000";
          window.open(`${apiUrl}/docs`, "_blank", "noopener,noreferrer");
          onOpenChange(false);
        },
      },
      {
        id: "sign-out",
        label: "Sign out",
        section: "Actions",
        icon: IconLogout,
        action: async () => {
          await authClient.signOut();
          queryClient.clear();
          navigate({ to: "/sign-in", search: { returnTo: undefined } });
        },
      },
    ];

    const all = [...goTo, ...create, ...actions];
    if (!query.trim()) return all;

    const needle = query.toLowerCase();

    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.section.toLowerCase().includes(needle),
    );
  }, [query, copied, navigate, queryClient, onOpenChange]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;

    const container = listRef.current;
    const item = container?.querySelector<HTMLElement>(
      `[data-index="${active}"]`,
    );

    item?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  async function execute(command: Command) {
    if (command.action !== undefined) {
      await command.action();
      return;
    }

    if (command.to !== undefined) {
      const path = command.to.replace("$orgSlug", orgSlug);
      navigate({ to: path as never, params: { orgSlug } as never });
      onOpenChange(false);
    }
  }

  React.useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, commands.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      } else if (event.key === "Home") {
        event.preventDefault();
        setActive(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActive(commands.length - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const chosen = commands[active];
        if (chosen !== undefined) void execute(chosen);
      }
    }

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
      className="top-[15vh] w-[min(92vw,600px)] translate-y-0 overflow-hidden p-0"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <IconSearch className="size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages, create actions, or commands…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <kbd className="rounded border border-border bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ESC
        </kbd>
      </div>

      <div
        ref={listRef}
        className="max-h-[380px] overflow-y-auto p-2"
        role="listbox"
        aria-label="Commands"
      >
        {commands.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results for “{query}”.
          </p>
        ) : (
          Object.entries(grouped).map(([section, list]) => (
            <div key={section} className="mb-2 last:mb-0">
              <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {section}
              </p>
              {list.map((command) => {
                index += 1;
                const localIndex = index;
                const isActive = localIndex === active;

                return (
                  <button
                    key={command.id}
                    data-index={localIndex}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActive(localIndex)}
                    onClick={() => void execute(command)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-white/[0.06] text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <command.icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {command.label}
                    </span>
                    {command.shortcut !== undefined && (
                      <kbd className="rounded border border-border bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <kbd className="rounded border border-border bg-white/[0.03] px-1.5 py-0.5 font-mono">
            ↑↓
          </kbd>
          navigate
          <kbd className="rounded border border-border bg-white/[0.03] px-1.5 py-0.5 font-mono">
            ↵
          </kbd>
          run
        </span>
        <span className="truncate pl-2">
          <span className="font-mono">{pathname}</span>
        </span>
      </div>
    </Dialog>
  );
}
