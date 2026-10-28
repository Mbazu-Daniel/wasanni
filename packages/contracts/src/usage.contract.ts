import { t, type UnwrapSchema } from "elysia";

export const USAGE_METRICS = [
  "sessions_created",
  "scores_submitted",
  "matches_created",
  "tournaments_created",
  "bandwidth_bytes",
] as const;

export type UsageMetric = (typeof USAGE_METRICS)[number];

export const USAGE_PERIODS = ["monthly"] as const;

export type UsagePeriod = (typeof USAGE_PERIODS)[number];

export const UsageMetricModel = t.Union([
  t.Literal("sessions_created"),
  t.Literal("scores_submitted"),
  t.Literal("matches_created"),
  t.Literal("tournaments_created"),
  t.Literal("bandwidth_bytes"),
]);
export type UsageMetricModel = UnwrapSchema<typeof UsageMetricModel>;

export const UsagePeriodModel = t.Union([t.Literal("monthly")]);
export type UsagePeriodModel = UnwrapSchema<typeof UsagePeriodModel>;

export const UsageCounterView = t.Object({
  platformId: t.Union([t.String(), t.Null()]),
  metric: UsageMetricModel,
  value: t.Number(),
});
export type UsageCounterView = UnwrapSchema<typeof UsageCounterView>;

export const UsageView = t.Object({
  period: t.Object({
    start: t.String({ format: "date-time" }),
    end: t.String({ format: "date-time" }),
  }),
  counters: t.Array(UsageCounterView),
  storageBytes: t.Number(),
});
export type UsageView = UnwrapSchema<typeof UsageView>;

export const PlatformUsageView = t.Object({
  period: t.Object({
    start: t.String({ format: "date-time" }),
    end: t.String({ format: "date-time" }),
  }),
  counters: t.Object({
    sessions_created: t.Number(),
    scores_submitted: t.Number(),
    matches_created: t.Number(),
    tournaments_created: t.Number(),
  }),
});
export type PlatformUsageView = UnwrapSchema<typeof PlatformUsageView>;

export const UsageQuotaView = t.Object({
  id: t.String(),
  metric: UsageMetricModel,
  period: UsagePeriodModel,
  limitValue: t.Number(),
});
export type UsageQuotaView = UnwrapSchema<typeof UsageQuotaView>;

export const UsageQuotaList = t.Object({ quotas: t.Array(UsageQuotaView) });
export type UsageQuotaList = UnwrapSchema<typeof UsageQuotaList>;

export const SetUsageQuotaBody = t.Object({
  metric: UsageMetricModel,
  limitValue: t.Number({ minimum: 0 }),
});
export type SetUsageQuotaBody = UnwrapSchema<typeof SetUsageQuotaBody>;

export const UsageParams = t.Object({ organizationId: t.String() });
export type UsageParams = UnwrapSchema<typeof UsageParams>;

export const UsageQuery = t.Object({
  period: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}$" })),
});
export type UsageQuery = UnwrapSchema<typeof UsageQuery>;

export const UsageQuotaParams = t.Object({
  organizationId: t.String(),
  metric: t.String(),
});
export type UsageQuotaParams = UnwrapSchema<typeof UsageQuotaParams>;

export const UsageDailyMetric = t.Union([
  t.Literal("sessions_created"),
  t.Literal("scores_submitted"),
  t.Literal("matches_created"),
  t.Literal("tournaments_created"),
]);
export type UsageDailyMetric = UnwrapSchema<typeof UsageDailyMetric>;

export const UsageDailyQuery = t.Object({
  metric: UsageDailyMetric,
  from: t.String({ format: "date-time" }),
  to: t.String({ format: "date-time" }),
});
export type UsageDailyQuery = UnwrapSchema<typeof UsageDailyQuery>;

export const UsageDailyRow = t.Object({
  date: t.String(),
  value: t.Number(),
});
export type UsageDailyRow = UnwrapSchema<typeof UsageDailyRow>;

export const UsageDailyView = t.Object({
  metric: UsageDailyMetric,
  rows: t.Array(UsageDailyRow),
});
export type UsageDailyView = UnwrapSchema<typeof UsageDailyView>;

export const UsageStorageGame = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  sizeBytes: t.Number(),
  fileCount: t.Number(),
});
export type UsageStorageGame = UnwrapSchema<typeof UsageStorageGame>;

export const UsageStorageTemplate = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  sizeBytes: t.Number(),
});
export type UsageStorageTemplate = UnwrapSchema<typeof UsageStorageTemplate>;

export const UsageStorageView = t.Object({
  games: t.Array(UsageStorageGame),
  templates: t.Array(UsageStorageTemplate),
  totalGames: t.Number(),
  totalTemplates: t.Number(),
  total: t.Number(),
});
export type UsageStorageView = UnwrapSchema<typeof UsageStorageView>;
