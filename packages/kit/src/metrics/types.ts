import type { createMetrics } from "./metrics.ts";

export type MetricLabels = Record<string, string>;

export type Metrics = ReturnType<typeof createMetrics>;
