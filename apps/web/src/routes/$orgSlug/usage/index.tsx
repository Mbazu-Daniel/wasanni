import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Chart } from "@/components/usage/daily-chart";
import { AgentSpend } from "@/components/usage/agent-spend";
import type { DailyMetric } from "@/lib/usage-types";
import type { UsageDailyView } from "@/lib/usage-types";
import type { PlatformView } from "@/lib/platform-types";

export const Route = createFileRoute("/$orgSlug/usage/")({
  head: () => ({ meta: [{ title: "Usage · Wasanni" }] }),
  component: UsagePage,
});

const METRICS: { value: DailyMetric; label: string; hint: string }[] = [
  {
    value: "sessions_created",
    label: "Sessions",
    hint: "Sessions opened by players through a platform.",
  },
  {
    value: "scores_submitted",
    label: "Scores",
    hint: "Scores submitted at the end of a session.",
  },
  {
    value: "matches_created",
    label: "Matches",
    hint: "Matches created on a platform, in a bracket or standalone.",
  },
  {
    value: "tournaments_created",
    label: "Tournaments",
    hint: "Tournaments run against a game assigned to a platform.",
  },
];

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

type GameOption = { id: string; name: string };

function UsagePage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";

  const [metric, setMetric] = React.useState<DailyMetric>("sessions_created");
  const [days, setDays] = React.useState<number>(30);
  const [platformId, setPlatformId] = React.useState<string>("");
  const [gameId, setGameId] = React.useState<string>("");

  const range = React.useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 86_400_000);
    return { start, end };
  }, [days]);

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformView[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameOption[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((response) =>
        response.games.map((game) => ({ id: game.id, name: game.name })),
      ),
  });

  const source = METRICS.find((item) => item.value === metric)!;

  const { data: daily, isFetching } = useQuery({
    queryKey: [
      "usage-daily",
      organizationId,
      metric,
      days,
      platformId,
      gameId,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        metric,
        from: range.start.toISOString(),
        to: range.end.toISOString(),
      });
      if (platformId !== "") params.set("platformId", platformId);
      if (gameId !== "") params.set("gameId", gameId);

      return apiFetch<UsageDailyView>(
        `/api/v1/organizations/${organizationId}/usage/daily?${params.toString()}`,
      );
    },
  });

  const rows = daily?.rows ?? [];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const peak = rows.reduce(
    (best, row) => (row.value > best.value ? row : best),
    { date: "—", value: 0 },
  );
  const activeDays = rows.filter((row) => row.value > 0).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-ink text-paper">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--launch-paper)_14%,transparent)_1px,transparent_1px)] bg-[size:18px_18px] opacity-40" />
        <div className="relative px-5 py-6 sm:px-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pink">
            Usage explorer
          </p>
          <h1 className="mt-2 max-w-xl font-poster text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em] sm:text-4xl">
            {source.label}
            <span className="text-pink"> · {total.toLocaleString()}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-paper/70">{source.hint}</p>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-paper/15 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/60">
            <span>
              Peak <span className="text-paper">{peak.value.toLocaleString()}</span>{" "}
              on {peak.date}
            </span>
            <span>
              Active days{" "}
              <span className="text-paper">
                {activeDays}/{rows.length}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-launch-ink bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {METRICS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMetric(item.value)}
              className={
                metric === item.value
                  ? "rounded-full bg-primary px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground"
                  : "rounded-full border border-launch-ink/20 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/65 transition-colors hover:border-launch-ink/45 hover:text-launch-ink"
              }
            >
              {item.label}
            </button>
          ))}

          <div className="ml-auto flex rounded-lg border border-launch-ink/20 p-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
            {RANGES.map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setDays(option.days)}
                className={
                  days === option.days
                    ? "rounded bg-launch-ink/[0.1] px-2.5 py-1 text-launch-ink"
                    : "rounded px-2.5 py-1 text-launch-ink/55 hover:text-launch-ink"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/60">
              Platform
            </p>
            <Select
              value={platformId}
              onValueChange={setPlatformId}
              options={[
                { value: "", label: "All platforms" },
                ...platforms.map((platform) => ({
                  value: platform.id,
                  label: platform.name,
                })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/60">
              Game
            </p>
            <Select
              value={gameId}
              onValueChange={setGameId}
              options={[
                { value: "", label: "All games" },
                ...games.map((game) => ({ value: game.id, label: game.name })),
              ]}
            />
          </div>
          {(platformId !== "" || gameId !== "") && (
            <div className="flex items-end sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setPlatformId("");
                  setGameId("");
                }}
                className="rounded-full border border-pink/45 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-pink transition-colors hover:bg-pink hover:text-print"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {isFetching && rows.length === 0 ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : (
        <div className="rounded-2xl border-2 border-launch-ink bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-launch-ink/68">
              {range.start.toISOString().slice(0, 10)} →{" "}
              {range.end.toISOString().slice(0, 10)}
            </h2>
            {isFetching && (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-pink">
                Loading
              </span>
            )}
          </div>
          <Chart rows={rows} />
        </div>
      )}

      <AgentSpend organizationId={organizationId} days={days} />
    </div>
  );
}
