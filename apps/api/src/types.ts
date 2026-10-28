import type { Db } from "@wasanni/db";
import type { Env, Logger, SendEmail } from "@wasanni/kit";

export type AppDeps = {
  logger: Logger;
  version: string;
  startedAt: number;
  corsOrigins: string[];
  db: Db;
  env: Env;
  ready: () => Promise<{ database: boolean; redis: boolean }>;
};

export type ModuleDeps = {
  db: Db;
  env: Env;
  logger: Logger;
  sendEmail?: SendEmail;
};
