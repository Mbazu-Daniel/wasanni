import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  IconPlus,
  IconLink,
  IconKey,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyActivity } from "@/components/usage/daily-chart";
import { UsageMetrics } from "@/components/usage/metrics-panel";
import { StorageBreakdown } from "@/components/usage/storage-panel";
import type { PlatformView } from "@/lib/platform-types";
import type {
  DailyMetric,
  UsageDailyView,
  UsageStorageView,
  UsageView,
} from "@/lib/usage-types";

type GameRow = { id: string; name: string; slug: string; hosting: "hosted" | "external" };
type AssignmentRow = { id: string; gameId: string; platformId: string };

type SetupStep = {
  title: string;
  description: string;
  done: boolean;
  action: ReactNode;
};

export const Route = createFileRoute("/$orgSlug/overview")({
  head: () => ({ meta: [{ title: "Overview · Wasanni" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const [setupExpanded, setSetupExpanded] = React.useState(false);
  const [dailyMetric, setDailyMetric] = React.useState<DailyMetric>(
    "sessions_created",
  );

  const dailyRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 86_400_000);
    return { start, end };
  }, []);

  const periodKey = React.useMemo(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }, []);

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameRow[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((response) => response.games),
    enabled: org !== null,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformView[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
    enabled: org !== null,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage", organizationId, periodKey],
    queryFn: () =>
      apiFetch<UsageView>(
        `/api/v1/organizations/${organizationId}/usage?period=${periodKey}`,
      ),
    enabled: org !== null,
  });

  const { data: daily } = useQuery({
    queryKey: ["usage-daily", organizationId, dailyMetric, 30],
    queryFn: () =>
      apiFetch<UsageDailyView>(
        `/api/v1/organizations/${organizationId}/usage/daily?metric=${dailyMetric}&from=${dailyRange.start.toISOString()}&to=${dailyRange.end.toISOString()}`,
      ),
    enabled: org !== null,
  });

  const { data: storage } = useQuery({
    queryKey: ["usage-storage", organizationId],
    queryFn: () =>
      apiFetch<UsageStorageView>(
        `/api/v1/organizations/${organizationId}/usage/storage`,
      ),
    enabled: org !== null,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ assignments: AssignmentRow[] }>(
        `/api/v1/organizations/${organizationId}/assignments`,
      ).then((response) => response.assignments),
    enabled: org !== null,
  });

  const keyQueries = useQueries({
    queries: platforms.map((platform) => ({
      queryKey: ["keys", organizationId, platform.id],
      queryFn: () =>
        apiFetch<{ keys: { id: string }[] }>(
          `/api/v1/organizations/${organizationId}/platforms/${platform.id}/keys`,
        ).then((response) => response.keys),
      enabled: org !== null,
    })),
  });

  const hasKeys = keyQueries.some((query) => (query.data?.length ?? 0) > 0);
  const game = games[0];
  const platform = platforms[0];

  const steps: SetupStep[] = [
    {
      title: "Create a platform",
      description:
        "The place your game is played. It owns the API keys and webhooks your server uses.",
      done: platforms.length > 0,
      action: platform ? (
        <Link
          to="/$orgSlug/platforms/$platformSlug"
          params={{ orgSlug, platformSlug: platform.slug }}
          search={{ tab: "overview" }}
        >
          <Button variant="outline" size="sm">
            Open {platform.name}
          </Button>
        </Link>
      ) : (
        <Link to="/$orgSlug/platforms/new" params={{ orgSlug }}>
          <Button size="sm" className="gap-1.5">
            <IconPlus className="size-3.5" />
            New platform
          </Button>
        </Link>
      ),
    },
    {
      title: "Create a game",
      description:
        "Hosted games get a build uploaded here. External games stay on your servers and call the API.",
      done: games.length > 0,
      action: game ? (
        <Link to="/$orgSlug/games/$gameSlug" params={{ orgSlug, gameSlug: game.slug }} search={{ tab: "overview" }}>
          <Button variant="outline" size="sm">
            Open {game.name}
          </Button>
        </Link>
      ) : (
        <Link to="/$orgSlug/games/new" params={{ orgSlug }}>
          <Button size="sm" className="gap-1.5">
            <IconPlus className="size-3.5" />
            New game
          </Button>
        </Link>
      ),
    },
    {
      title: "Assign the game to the platform",
      description:
        "A platform can only open sessions for the games assigned to it.",
      done: assignments.length > 0,
      action: game ? (
        <Link
          to="/$orgSlug/games/$gameSlug"
          params={{ orgSlug, gameSlug: game.slug }}
          search={{ tab: "assignments" }}
        >
          <Button
            size="sm"
            variant={assignments.length > 0 ? "outline" : "default"}
            className="gap-1.5"
          >
            <IconLink className="size-3.5" />
            Assign
          </Button>
        </Link>
      ) : null,
    },
    {
      title: "Create an API key",
      description:
        "Your server signs session and score requests with a key scoped to the platform.",
      done: hasKeys,
      action: platform ? (
        <Link
          to="/$orgSlug/platforms/$platformSlug"
          params={{ orgSlug, platformSlug: platform.slug }}
          search={{ tab: "keys" }}
        >
          <Button size="sm" variant={hasKeys ? "outline" : "default"} className="gap-1.5">
            <IconKey className="size-3.5" />
            Open keys
          </Button>
        </Link>
      ) : null,
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const ready = completed === steps.length;

  const totals: Record<string, number> = {};

  for (const counter of usage?.counters ?? []) {
    if (counter.platformId === null) continue;
    totals[counter.metric] = (totals[counter.metric] ?? 0) + counter.value;
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="on-fluoro relative overflow-hidden rounded-2xl bg-cyan text-print">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(32,32,45,0.14)_1px,transparent_1px)] bg-[size:18px_18px] opacity-50" />
        <span className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-2 border-ink/15" />
        <span className="pointer-events-none absolute -right-4 top-6 size-40 rounded-full border-2 border-ink/10" />
        <div className="relative max-w-2xl px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="max-w-xl font-poster text-4xl font-black uppercase leading-[0.88] tracking-[-0.04em] text-ink sm:text-5xl">
            Build the game.
            <br />
            <em className="not-italic text-blue">Then give it a world.</em>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink/75 sm:text-base">
            {org?.name ?? "Your workspace"} is where your builds become playable,
            competitive games. Host the client, connect a platform, and ship the
            first session from one control room.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/$orgSlug/games/new" params={{ orgSlug }} className="launch-primary-button gap-2">
              <IconPlus className="size-4" />
              Create a game
            </Link>
          </div>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 border-t border-ink/15 pt-5">
            <HeroSignal label="BUILD" value={games.length > 0 ? "READY" : "EMPTY"} />
            <HeroSignal label="PLATFORM" value={platforms.length > 0 ? "LINKED" : "NEXT"} />
            <HeroSignal label="SESSION" value={ready ? "OPEN" : "SETUP"} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border-2 border-launch-ink bg-card">
        <button
          onClick={() => setSetupExpanded(!setupExpanded)}
          className="flex w-full items-center justify-between gap-3 border-b border-launch-ink/22 px-5 py-5 text-left transition-colors hover:bg-launch-ink/[0.04]"
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-launch-ink">Get a game into the world</h2>
            <p className="mt-1 text-xs text-launch-ink/68">{ready ? "Your workspace is ready for its first live session." : `${completed} of ${steps.length} milestones complete.`}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-launch-ink/16 bg-launch-ink/[0.04] px-3 py-1.5 font-mono text-[10px] text-launch-ink/68">
              {completed}/{steps.length} complete
            </div>
            {setupExpanded ? <IconChevronUp className="size-4 text-launch-ink/68" /> : <IconChevronDown className="size-4 text-launch-ink/68" />}
          </div>
        </button>
        {setupExpanded && (
          <ol className="divide-y divide-launch-ink/16">
            {steps.map((step, index) => (
              <li key={step.title} className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-launch-ink/[0.04]">
                <span className={step.done ? "grid size-7 shrink-0 place-items-center rounded-lg bg-cyan/15 text-cyan" : "grid size-7 shrink-0 place-items-center rounded-lg border border-launch-ink/16 bg-launch-ink/[0.04] font-mono text-[11px] text-launch-ink/68"}>
                  {step.done ? <IconCheck className="size-3.5" /> : `0${index + 1}`}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className={step.done ? "text-sm font-medium text-launch-ink/68" : "text-sm font-medium text-launch-ink"}>{step.title}</p>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-launch-ink/68">{step.description}</p>
                </div>
                <div className="shrink-0 pt-0.5">{step.action}</div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {usageLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <section className="space-y-4">
          <SectionTitle
            eyebrow="This month"
            title="What the workspace is doing"
            to="/$orgSlug/usage"
            params={{ orgSlug }}
            linkLabel="Filter by platform or game"
          />
          <UsageMetrics
            totals={totals}
            gameCount={games.length}
            platformCount={platforms.length}
          />

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border-2 border-launch-ink bg-card p-4 sm:p-5">
              <DailyActivity
                rows={daily?.rows}
                metric={dailyMetric}
                onMetricChange={setDailyMetric}
                loading={daily === undefined}
              />
            </div>
            <div className="rounded-2xl border-2 border-launch-ink bg-card p-4 sm:p-5">
              <StorageBreakdown storage={storage} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  to,
  params,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  to: "/$orgSlug/usage";
  params: { orgSlug: string };
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-launch-ink pb-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-launch-ink/68">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 font-poster text-xl font-black uppercase tracking-[-0.02em] text-launch-ink">
          {title}
        </h2>
      </div>
      <Link
        to={to}
        params={params}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-launch-purple transition-colors hover:text-launch-ink"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function HeroSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-ink/15 pl-3 first:border-l-0 first:pl-0">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink/60">{label}</p>
      <p className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-ink">{value}</p>
    </div>
  );
}
