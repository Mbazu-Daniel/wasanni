import type { Logger } from "@wasanni/kit";
import type { createUsageService } from "./usage.service.ts";
import type { DAILY_SOURCES } from "./constants.ts";

export type UsageServiceDeps = {
  logger: Logger;
  enabled: boolean;
};

export type UsageService = ReturnType<typeof createUsageService>;

export type DailyMetric = keyof typeof DAILY_SOURCES;

export type DailyRow = {
  date: string;
  value: number;
};
