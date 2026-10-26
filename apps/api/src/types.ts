import type { Logger } from "@wasanni/kit";

export type AppDeps = {
  logger: Logger;
  version: string;
  startedAt: number;
  corsOrigins: string[];
  ready: () => Promise<{ database: boolean; redis: boolean }>;
};
