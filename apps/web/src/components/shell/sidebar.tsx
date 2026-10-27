import { Link, useMatchRoute, useParams } from "@tanstack/react-router";
import {
  IconLayoutDashboard,
  IconDeviceGamepad2,
  IconLayout,
  IconBroadcast,
  IconLink,
  IconKey,
  IconWebhook,
  IconPlayerPlay,
  IconTrophy,
  IconMedal,
  IconSwords,
  IconList,
  IconChartBar,
  IconCode,
  IconUsers,
  IconBuilding,
  IconUser,
  IconChevronLeft,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type IconComponent = typeof IconLayoutDashboard;

type NavItem = {
  label: string;
  icon: IconComponent;
  to?:
    | "/o/$orgSlug/overview"
    | "/o/$orgSlug/games"
    | "/o/$orgSlug/platforms"
    | "/o/$orgSlug/assignments"
    | "/o/$orgSlug/templates"
    | "/o/$orgSlug/tournaments"
    | "/o/$orgSlug/keys"
    | "/o/$orgSlug/webhooks"
    | "/o/$orgSlug/matches"
    | "/o/$orgSlug/audit"
    | "/o/$orgSlug/developer"
    | "/o/$orgSlug/settings/members"
    | "/o/$orgSlug/settings/account";
};

const groups: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ label: "Overview", to: "/o/$orgSlug/overview", icon: IconLayoutDashboard }],
  },
  {
    label: "Build",
    items: [
      { label: "Games", to: "/o/$orgSlug/games", icon: IconDeviceGamepad2 },
      { label: "Templates", to: "/o/$orgSlug/templates", icon: IconLayout },
    ],
  },
  {
    label: "Distribute",
    items: [
      { label: "Platforms", to: "/o/$orgSlug/platforms", icon: IconBroadcast },
      { label: "Assignments", to: "/o/$orgSlug/assignments", icon: IconLink },
      { label: "API keys", to: "/o/$orgSlug/keys", icon: IconKey },
      { label: "Webhooks", to: "/o/$orgSlug/webhooks", icon: IconWebhook },
    ],
  },
  {
    label: "Play",
    items: [
      { label: "Sessions", icon: IconPlayerPlay },
      { label: "Leaderboards", icon: IconTrophy },
    ],
  },
  {
    label: "Compete",
    items: [
      { label: "Tournaments", to: "/o/$orgSlug/tournaments", icon: IconMedal },
      { label: "Matches", to: "/o/$orgSlug/matches", icon: IconSwords },
    ],
  },
  {
    label: "Observe",
    items: [
      { label: "Audit", to: "/o/$orgSlug/audit", icon: IconList },
      { label: "Usage", icon: IconChartBar },
      { label: "Developer", to: "/o/$orgSlug/developer", icon: IconCode },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Members", to: "/o/$orgSlug/settings/members", icon: IconUsers },
      { label: "Organization", icon: IconBuilding },
      { label: "Account", to: "/o/$orgSlug/settings/account", icon: IconUser },
    ],
  },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { orgSlug } = useParams({ from: "/o/$orgSlug" });
  const matchRoute = useMatchRoute();

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-[#070915] transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 border-b border-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,#ff2e88,#2e7bff)]">
          <span className="absolute inset-[2px] rounded-md bg-[#070915]" />
          <span className="relative font-mono text-xs font-bold text-gradient-pink-blue">
            W
          </span>
        </span>
        {!collapsed && (
          <span className="font-display text-sm font-semibold tracking-tight">Wasanni</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        {groups.map((group) => (
          <div key={group.label ?? "root"} className="mb-4 last:mb-0">
            {group.label && !collapsed && (
              <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                if (item.to === undefined) {
                  return (
                    <span
                      key={item.label}
                      title="Not built yet"
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/40",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </span>
                  );
                }

                const active = matchRoute({
                  to: item.to,
                  params: { orgSlug },
                  fuzzy: true,
                });

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    params={{ orgSlug }}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground",
                      active && "bg-pink/10 text-foreground hover:bg-pink/10",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-pink"
                      />
                    )}
                    <item.icon
                      className={cn("size-4 shrink-0", active && "text-pink")}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <IconChevronLeft
          className={cn("size-4 transition-transform", collapsed && "rotate-180")}
        />
      </button>
    </aside>
  );
}
