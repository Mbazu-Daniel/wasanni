import type { MetricLabels } from "./types.ts";

const formatLabels = (labels: MetricLabels): string => {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) return "";

  const body = entries
    .map(([name, value]) => `${name}="${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`)
    .join(",");

  return `{${body}}`;
};

type Series = {
  readonly help: string;
  readonly samples: Map<string, number>;
};

export function createMetrics() {
  const counters = new Map<string, Series>();

  return {
    counter(name: string, help: string): void {
      if (!counters.has(name)) counters.set(name, { help, samples: new Map() });
    },

    inc(name: string, labels: MetricLabels = {}, by = 1): void {
      const series = counters.get(name);
      if (series === undefined) return;

      const key = formatLabels(labels);

      series.samples.set(key, (series.samples.get(key) ?? 0) + by);
    },

    render(): string {
      const lines: string[] = [];

      for (const [name, series] of counters) {
        lines.push(`# HELP ${name} ${series.help}`, `# TYPE ${name} counter`);

        for (const [labels, value] of series.samples) {
          lines.push(`${name}${labels} ${value}`);
        }
      }

      return `${lines.join("\n")}\n`;
    },
  };
}
