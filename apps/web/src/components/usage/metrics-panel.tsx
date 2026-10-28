import {
  IconBroadcast,
  IconChartBar,
  IconDeviceGamepad2,
  IconMedal,
  IconPlayerPlay,
  IconSwords,
  IconTrophy,
} from "@tabler/icons-react";
import { formatBytes } from "@/lib/format";
import type { UsageMetric } from "@/lib/usage-types";

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
  gameCount,
  platformCount,
}: {
  totals: Record<string, number>;
  gameCount: number;
  platformCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
      <Card
        label="Games"
        icon={IconDeviceGamepad2}
        value={gameCount}
        format={count}
      />
      <Card
        label="Platforms"
        icon={IconBroadcast}
        value={platformCount}
        format={count}
      />
      {CARDS.map((card) => (
        <Card
          key={card.metric}
          label={card.label}
          icon={card.icon}
          value={totals[card.metric] ?? 0}
          format={card.format}
        />
      ))}
    </div>
  );
}

const count = (value: number) => value.toLocaleString();

function Card({
  label,
  value,
  icon: Icon,
  format,
}: {
  label: string;
  value: number;
  icon: Icon;
  format: (value: number) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {format(value)}
      </p>
    </div>
  );
}
