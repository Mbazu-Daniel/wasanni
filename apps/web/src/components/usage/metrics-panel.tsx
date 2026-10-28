import {
  IconChartBar,
  IconMedal,
  IconPlayerPlay,
  IconSwords,
  IconTrophy,
} from "@tabler/icons-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UsageMetric, UsageQuotaView } from "@/lib/usage-types";

type Icon = React.ComponentType<{ className?: string }>;

const CARDS: {
  metric: UsageMetric;
  label: string;
  icon: Icon;
  format: (value: number) => string;
}[] = [
  {
    metric: "sessions_created",
    label: "Sessions",
    icon: IconPlayerPlay,
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "scores_submitted",
    label: "Scores",
    icon: IconTrophy,
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "matches_created",
    label: "Matches",
    icon: IconSwords,
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "tournaments_created",
    label: "Tournaments",
    icon: IconMedal,
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "bandwidth_bytes",
    label: "Bandwidth",
    icon: IconChartBar,
    format: formatBytes,
  },
];

export function UsageMetrics({
  totals,
  quotas,
}: {
  totals: Record<string, number>;
  quotas: UsageQuotaView[];
}) {
  const quotaByMetric = new Map(quotas.map((quota) => [quota.metric, quota]));

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <Card
          key={card.metric}
          label={card.label}
          icon={card.icon}
          value={totals[card.metric] ?? 0}
          format={card.format}
          quota={quotaByMetric.get(card.metric)?.limitValue}
        />
      ))}
    </div>
  );
}

function Card({
  label,
  value,
  icon: Icon,
  quota,
  format,
}: {
  label: string;
  value: number;
  icon: Icon;
  quota?: number;
  format: (value: number) => string;
}) {
  const overWarn = quota !== undefined && quota > 0 && value / quota >= 0.8;
  const overLimit = quota !== undefined && quota > 0 && value >= quota;

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
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {format(value)}
      </p>
      {quota !== undefined && quota > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          of {format(quota)}
        </p>
      )}
    </div>
  );
}
