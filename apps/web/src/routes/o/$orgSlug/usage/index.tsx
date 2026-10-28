import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  IconChartBar,
  IconPlayerPlay,
  IconTrophy,
  IconSwords,
  IconMedal,
  IconDeviceGamepad2,
  IconLayout,
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";

type Metric =
  | "sessions_created"
  | "scores_submitted"
  | "matches_created"
  | "tournaments_created"
  | "bandwidth_bytes";

const METRIC_LABELS: Record<Metric, string> = {
  sessions_created: "Sessions",
  scores_submitted: "Scores",
  matches_created: "Matches",
  tournaments_created: "Tournaments",
  bandwidth_bytes: "Bandwidth",
};

const DAILY_METRICS = [
  "sessions_created",
  "scores_submitted",
  "matches_created",
  "tournaments_created",
] as const;

type UsageResponse = {
  period: { start: string; end: string };
  counters: { platformId: string | null; metric: string; value: number }[];
  storageBytes: number;
};

type DailyResponse = {
  metric: string;
  rows: { date: string; value: number }[];
};

type StorageResponse = {
  games: { id: string; name: string; slug: string; sizeBytes: number; fileCount: number }[];
  templates: { id: string; name: string; slug: string; sizeBytes: number }[];
  totalGames: number;
  totalTemplates: number;
  total: number;
};

type QuotaRow = {
  id: string;
  metric: string;
  period: string;
  limitValue: number;
};

type PlatformRow = { id: string; name: string; slug: string };

export const Route = createFileRoute("/o/$orgSlug/usage/")({
  head: () => ({ meta: [{ title: "Usage · Wasanni" }] }),
  component: UsagePage,
});

function UsagePage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const queryClient = useQueryClient();

  const [monthOffset, setMonthOffset] = React.useState(0);
  const [dailyMetric, setDailyMetric] =
    React.useState<(typeof DAILY_METRICS)[number]>("sessions_created");

  const period = React.useMemo(() => {
    const now = new Date();
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
    );

    return {
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  }, [monthOffset]);

  const dailyRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 86_400_000);
    return { start, end };
  }, []);

  const { data: usage, isLoading } = useQuery({
    queryKey: ["usage", organizationId, period.key],
    queryFn: () =>
      apiFetch<UsageResponse>(
        `/api/v1/organizations/${organizationId}/usage?period=${period.key}`,
      ),
  });

  const { data: daily } = useQuery({
    queryKey: ["usage-daily", organizationId, dailyMetric],
    queryFn: () =>
      apiFetch<DailyResponse>(
        `/api/v1/organizations/${organizationId}/usage/daily?metric=${dailyMetric}&from=${dailyRange.start.toISOString()}&to=${dailyRange.end.toISOString()}`,
      ),
  });

  const { data: storage } = useQuery({
    queryKey: ["usage-storage", organizationId],
    queryFn: () =>
      apiFetch<StorageResponse>(
        `/api/v1/organizations/${organizationId}/usage/storage`,
      ),
  });

  const { data: quotas = [] } = useQuery({
    queryKey: ["quotas", organizationId],
    queryFn: () =>
      apiFetch<{ quotas: QuotaRow[] }>(
        `/api/v1/organizations/${organizationId}/quotas`,
      ).then((response) => response.quotas),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
  });

  const platformById = new Map(platforms.map((platform) => [platform.id, platform]));

  const totals: Record<string, number> = {
    sessions_created: 0,
    scores_submitted: 0,
    matches_created: 0,
    tournaments_created: 0,
    bandwidth_bytes: 0,
  };
  const perPlatform = new Map<string, Record<string, number>>();

  for (const counter of usage?.counters ?? []) {
    if (counter.platformId === null) continue;
    totals[counter.metric] = (totals[counter.metric] ?? 0) + counter.value;
    const entry = perPlatform.get(counter.platformId) ?? {};
    entry[counter.metric] = (entry[counter.metric] ?? 0) + counter.value;
    perPlatform.set(counter.platformId, entry);
  }

  const quotaByMetric = new Map(quotas.map((quota) => [quota.metric, quota]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage"
        description="How much this organization is using across sessions, scores, storage, and bandwidth."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonthOffset((value) => value - 1)}
              aria-label="Previous month"
            >
              <IconChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-medium">
              {period.label}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonthOffset((value) => Math.min(value + 1, 0))}
              disabled={monthOffset === 0}
              aria-label="Next month"
            >
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <UsageCard
              label="Sessions"
              value={totals.sessions_created ?? 0}
              icon={IconPlayerPlay}
              quota={quotaByMetric.get("sessions_created")?.limitValue}
            />
            <UsageCard
              label="Scores"
              value={totals.scores_submitted ?? 0}
              icon={IconTrophy}
              quota={quotaByMetric.get("scores_submitted")?.limitValue}
            />
            <UsageCard
              label="Matches"
              value={totals.matches_created ?? 0}
              icon={IconSwords}
              quota={quotaByMetric.get("matches_created")?.limitValue}
            />
            <UsageCard
              label="Tournaments"
              value={totals.tournaments_created ?? 0}
              icon={IconMedal}
              quota={quotaByMetric.get("tournaments_created")?.limitValue}
            />
            <UsageCard
              label="Bandwidth"
              value={formatBytes(totals.bandwidth_bytes ?? 0)}
              icon={IconChartBar}
              quota={quotaByMetric.get("bandwidth_bytes")?.limitValue}
              formatQuota={formatBytes}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Last 30 days</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Daily activity for the selected metric.
                  </p>
                </div>
                <div className="flex rounded-lg border border-border p-0.5 text-[11px]">
                  {DAILY_METRICS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDailyMetric(option)}
                      className={
                        dailyMetric === option
                          ? "rounded bg-white/[0.06] px-2 py-1 text-foreground"
                          : "rounded px-2 py-1 text-muted-foreground hover:text-foreground"
                      }
                    >
                      {METRIC_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>
              {daily ? (
                <DailyChart data={daily.rows} />
              ) : (
                <Skeleton className="h-48 rounded-xl" />
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold">Storage</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {storage ? formatBytes(storage.total) : "—"} used across{" "}
                {storage?.games.length ?? 0} games and{" "}
                {storage?.templates.length ?? 0} templates.
              </p>
              <div className="mt-3 space-y-2">
                {storage === undefined || storage.total === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No storage used yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <StorageBar
                      label="Games"
                      value={storage.totalGames}
                      total={storage.total}
                      color="from-pink to-pink-soft"
                    />
                    <StorageBar
                      label="Templates"
                      value={storage.totalTemplates}
                      total={storage.total}
                      color="from-blue to-blue-soft"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Per platform</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Session, score, match, and tournament counts per platform this
              month.
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Platform
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Sessions
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Scores
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Matches
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Tournaments
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Bandwidth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {perPlatform.size === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <p className="text-xs text-muted-foreground">
                          No platform activity this month.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    [...perPlatform.entries()].map(([platformId, counts]) => {
                      const platform = platformById.get(platformId);

                      return (
                        <tr
                          key={platformId}
                          className="border-t border-border transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3 align-middle">
                            {platform === undefined ? (
                              <span className="font-mono text-xs text-muted-foreground">
                                {platformId}
                              </span>
                            ) : (
                              <Link
                                to="/o/$orgSlug/platforms/$platformSlug"
                                params={{ orgSlug, platformSlug: platform.slug }}
                                search={{ tab: "overview" }}
                                className="text-sm font-medium hover:text-blue-soft"
                              >
                                {platform.name}
                              </Link>
                            )}
                          </td>
                          <Num value={counts.sessions_created ?? 0} />
                          <Num value={counts.scores_submitted ?? 0} />
                          <Num value={counts.matches_created ?? 0} />
                          <Num value={counts.tournaments_created ?? 0} />
                          <td className="px-4 py-3 text-right align-middle">
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatBytes(counts.bandwidth_bytes ?? 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {storage !== undefined && storage.games.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold">Storage breakdown</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Current ready files, by game and template.
              </p>
              <div className="mt-3 space-y-3">
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2.5">
                    <IconDeviceGamepad2 className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Games</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      {formatBytes(storage.totalGames)}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {storage.games.map((game) => (
                        <tr
                          key={game.id}
                          className="border-t border-border first:border-t-0"
                        >
                          <td className="px-4 py-2.5 align-middle">
                            <span className="text-sm">{game.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right align-middle font-mono text-xs text-muted-foreground">
                            {game.fileCount} file{game.fileCount === 1 ? "" : "s"}
                          </td>
                          <td className="px-4 py-2.5 text-right align-middle font-mono text-xs">
                            {formatBytes(game.sizeBytes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {storage.templates.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2.5">
                      <IconLayout className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Templates</span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        {formatBytes(storage.totalTemplates)}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {storage.templates.map((template) => (
                          <tr
                            key={template.id}
                            className="border-t border-border first:border-t-0"
                          >
                            <td className="px-4 py-2.5 align-middle">
                              <span className="text-sm">{template.name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right align-middle font-mono text-xs text-muted-foreground">
                              {formatBytes(template.sizeBytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <QuotasPanel
            organizationId={organizationId}
            quotas={quotas}
            currentValues={totals}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ["quotas", organizationId] })
            }
          />
        </>
      )}
    </div>
  );
}

function UsageCard({
  label,
  value,
  icon: Icon,
  quota,
  formatQuota,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  quota?: number;
  formatQuota?: (value: number) => string;
}) {
  const numericValue = typeof value === "number" ? value : null;
  const overWarn =
    numericValue !== null && quota !== undefined && quota > 0 && numericValue / quota >= 0.8;
  const overLimit =
    numericValue !== null && quota !== undefined && quota > 0 && numericValue >= quota;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-4",
        overLimit
          ? "border-rose-400/40"
          : overWarn
            ? "border-amber-400/40"
            : "border-border",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      {quota !== undefined && quota > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          of {formatQuota ? formatQuota(quota) : quota.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function Num({ value }: { value: number }) {
  return (
    <td className="px-4 py-3 text-right align-middle font-mono text-xs tabular-nums">
      {value.toLocaleString()}
    </td>
  );
}

function StorageBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{formatBytes(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">No data yet.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((row) => row.value), 1);
  const width = 720;
  const height = 200;
  const gap = 2;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <svg viewBox={`0 0 ${width} ${height + 28}`} className="w-full">
        <defs>
          <linearGradient id="usageBar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff2e88" />
            <stop offset="100%" stopColor="#2e7bff" />
          </linearGradient>
        </defs>

        {data.map((row, index) => {
          const barHeight = (row.value / max) * height;
          const x = index * (barWidth + gap);
          const y = height - barHeight;

          return (
            <g key={row.date}>
              <title>
                {row.date}: {row.value}
              </title>
              <motion.rect
                x={x}
                y={height}
                width={barWidth}
                height={0}
                rx={2}
                fill="url(#usageBar)"
                initial={{ height: 0, y: height }}
                animate={{ height: barHeight, y }}
                transition={{ delay: index * 0.01, duration: 0.4, ease: "easeOut" }}
              />
              {index % 5 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 9 }}
                >
                  {row.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          stroke="rgba(122,184,255,0.15)"
        />
      </svg>
    </div>
  );
}

function QuotasPanel({
  organizationId,
  quotas,
  currentValues,
  onChanged,
}: {
  organizationId: string;
  quotas: QuotaRow[];
  currentValues: Record<string, number>;
  onChanged: () => void;
}) {
  const metrics: {
    key: Metric;
    label: string;
    current: number;
    format: (value: number) => string;
  }[] = [
    {
      key: "sessions_created",
      label: "Sessions / month",
      current: currentValues.sessions_created ?? 0,
      format: (value) => value.toLocaleString(),
    },
    {
      key: "scores_submitted",
      label: "Scores / month",
      current: currentValues.scores_submitted ?? 0,
      format: (value) => value.toLocaleString(),
    },
    {
      key: "matches_created",
      label: "Matches / month",
      current: currentValues.matches_created ?? 0,
      format: (value) => value.toLocaleString(),
    },
    {
      key: "tournaments_created",
      label: "Tournaments / month",
      current: currentValues.tournaments_created ?? 0,
      format: (value) => value.toLocaleString(),
    },
    {
      key: "bandwidth_bytes",
      label: "Bandwidth / month",
      current: currentValues.bandwidth_bytes ?? 0,
      format: formatBytes,
    },
  ];

  const quotaByMetric = new Map(quotas.map((quota) => [quota.metric, quota]));

  return (
    <div>
      <h2 className="text-sm font-semibold">Quotas</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Set a monthly cap for a metric. Once a quota is reached, the platform is
        blocked from creating more of that resource until next month.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/40">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Metric
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                This month
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Quota
              </th>
              <th className="w-32 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <QuotaRow
                key={metric.key}
                organizationId={organizationId}
                metric={metric.key}
                label={metric.label}
                current={metric.current}
                format={metric.format}
                quota={quotaByMetric.get(metric.key)?.limitValue}
                onChanged={onChanged}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotaRow({
  organizationId,
  metric,
  label,
  current,
  format,
  quota,
  onChanged,
}: {
  organizationId: string;
  metric: string;
  label: string;
  current: number;
  format: (value: number) => string;
  quota?: number;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(quota === undefined ? "" : String(quota));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setValue(quota === undefined ? "" : String(quota));
  }, [quota]);

  const overLimit = quota !== undefined && quota > 0 && current >= quota;

  async function save() {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error("Enter a valid number");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/quotas`, {
        method: "PUT",
        body: JSON.stringify({ metric, limitValue: numeric }),
      });
      toast.success("Quota saved");
      setEditing(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/quotas/${metric}`, {
        method: "DELETE",
      });
      toast.success("Quota removed");
      setEditing(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          {overLimit && <IconAlertTriangle className="size-3.5 text-rose-300" />}
        </div>
      </td>
      <td className="px-4 py-3 text-right align-middle font-mono text-xs tabular-nums">
        {format(current)}
      </td>
      <td className="px-4 py-3 align-middle">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={save} disabled={busy} className="h-7">
              <IconCheck className="size-3" />
            </Button>
          </div>
        ) : quota === undefined ? (
          <span className="text-xs text-muted-foreground">no limit</span>
        ) : (
          <span className="font-mono text-xs">{format(quota)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right align-middle">
        {editing ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setValue(quota === undefined ? "" : String(quota));
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            {quota !== undefined && (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-300"
                onClick={remove}
                disabled={busy}
              >
                Remove
              </Button>
            )}
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {quota === undefined ? "Set quota" : "Edit"}
          </Button>
        )}
      </td>
    </tr>
  );
}
