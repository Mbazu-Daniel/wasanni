import type { Logger } from "@wasanni/kit";
import type { createUsageService } from "./usage.service.ts";

export type UsageServiceDeps = {
  logger: Logger;
  enabled: boolean;
};

export type UsageService = ReturnType<typeof createUsageService>;
