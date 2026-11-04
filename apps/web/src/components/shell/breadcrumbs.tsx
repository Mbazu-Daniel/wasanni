import { useRouter, useRouterState } from "@tanstack/react-router";
import { IconChevronRight } from "@tabler/icons-react";

const LABELS: Record<string, string> = {
  overview: "Overview",
  games: "Games",
  templates: "Templates",
  platforms: "Platforms",
  assignments: "Assignments",
  keys: "API keys",
  sessions: "Sessions",
  leaderboards: "Leaderboards",
  tournaments: "Tournaments",
  matches: "Matches",
  audit: "Audit",
  builder: "Builder",
  usage: "Usage",
  settings: "Settings",
  danger: "Danger zone",
  members: "Members",
  organization: "Organization",
  account: "Account",
  new: "New",
};

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}/i;

const shortId = (segment: string): string =>
  `${segment.slice(0, 4)}…${segment.slice(-4)}`;

const labelFor = (segment: string): string =>
  LABELS[segment] ?? (UUID_LIKE.test(segment) ? shortId(segment) : segment);

export function Breadcrumbs() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  const ancestors = segments.slice(2, -1);

  if (ancestors.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      {ancestors.map((segment, index) => {
        const href = "/" + segments.slice(0, 3 + index).join("/");

        return (
          <div key={href} className="flex items-center gap-1.5">
            {index > 0 && <IconChevronRight className="size-3 text-muted-foreground/50" />}
            <a
              href={href}
              className="transition-colors hover:text-foreground"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                router.navigate({ href });
              }}
            >
              {labelFor(segment)}
            </a>
          </div>
        );
      })}
      <IconChevronRight className="size-3 text-muted-foreground/50" />
    </nav>
  );
}
