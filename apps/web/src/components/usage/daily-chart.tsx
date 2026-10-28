import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyMetric, UsageDailyRow } from "@/lib/usage-types";

const METRICS = [
  "sessions_created",
  "scores_submitted",
  "matches_created",
  "tournaments_created",
] as const;

const LABELS: Record<(typeof METRICS)[number], string> = {
  sessions_created: "Sessions",
  scores_submitted: "Scores",
  matches_created: "Matches",
  tournaments_created: "Tournaments",
};

export function DailyActivity({
  rows,
  metric,
  onMetricChange,
  loading,
}: {
  rows: UsageDailyRow[] | undefined;
  metric: DailyMetric;
  onMetricChange: (metric: DailyMetric) => void;
  loading: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Last 30 days</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily activity for the selected metric.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 text-[11px]">
          {METRICS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onMetricChange(option)}
              className={
                metric === option
                  ? "rounded bg-ink/[0.08] px-2 py-1 text-foreground"
                  : "rounded px-2 py-1 text-muted-foreground hover:text-foreground"
              }
            >
              {LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {loading || rows === undefined ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Chart rows={rows} />
      )}
    </div>
  );
}

export function Chart({
  rows,
  format = (value) => value.toLocaleString(),
}: {
  rows: UsageDailyRow[];
  format?: (value: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">No data yet.</p>
      </div>
    );
  }

  const max = Math.max(...rows.map((row) => row.value), 1);
  const width = 720;
  const height = 200;
  const gap = 2;
  const barWidth = (width - gap * (rows.length - 1)) / rows.length;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <svg viewBox={`0 0 ${width} ${height + 28}`} className="w-full">
        <defs>
          <linearGradient id="usageBar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pink)" />
            <stop offset="100%" stopColor="var(--color-blue)" />
          </linearGradient>
        </defs>

        {rows.map((row, index) => {
          const barHeight = (row.value / max) * height;
          const x = index * (barWidth + gap);
          const y = height - barHeight;

          return (
            <g key={row.date}>
              <title>
                {row.date}: {format(row.value)}
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
                transition={{
                  delay: index * 0.01,
                  duration: 0.4,
                  ease: "easeOut",
                }}
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
          stroke="var(--launch-line-strong)"
        />
      </svg>
    </div>
  );
}
