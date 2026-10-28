export type DailyMetric =
  | "sessions_created"
  | "scores_submitted"
  | "matches_created"
  | "tournaments_created";

export type {
  UsageView,
  UsageCounterView,
  UsageDailyView,
  UsageDailyRow,
  UsageStorageView,
  UsageStorageGame,
  UsageStorageTemplate,
  UsageQuotaView,
  UsageMetric,
  OrganizationExport,
} from "@wasanni/contracts";
