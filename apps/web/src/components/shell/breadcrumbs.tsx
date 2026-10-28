import { useRouter, useRouterState } from "@tanstack/react-router";
import { IconChevronRight } from "@tabler/icons-react";

const LABELS: Record<string, string> = {
  overview: "Overview",
  games: "Games",
  templates: "Templates",
  platforms: "Platforms",
  assignments: "Assignments",
  keys: "API keys",
  webhooks: "Webhooks",
  sessions: "Sessions",
  leaderboards: "Leaderboards",
  tournaments: "Tournaments",
  matches: "Matches",
  audit: "Audit",
  agents: "Builder",
  usage: "Usage",
  settings: "Settings",
  danger: "Danger zone",
  members: "Members",
  organization: "Organization",
  account: "Account",
  new: "New",
};

const shortId = (segment: string): string =>
  `${segment.slice(0, 4)}…${segment.slice(-4)}`;

const labelFor = (segment: string): string =>
  LABELS[segment] ?? (segment.includes("_") ? shortId(segment) : segment);

export function Breadcrumbs() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 3) return null;

  const trail = segments.slice(2);

  const crumbs = trail.map((segment, index) => {
    const href = "/" + segments.slice(0, 3 + index).join("/");

    return {
      href,
      label: labelFor(segment),
      isLast: index === trail.length - 1,
    };
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {crumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          {index > 0 && <IconChevronRight className="size-3 text-muted-foreground/50" />}
          {crumb.isLast ? (
            <span className="text-foreground">{crumb.label}</span>
          ) : (
            <a
              href={crumb.href}
              className="transition-colors hover:text-foreground"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                router.navigate({ href: crumb.href });
              }}
            >
              {crumb.label}
            </a>
          )}
        </div>
      ))}
    </nav>
  );
}
