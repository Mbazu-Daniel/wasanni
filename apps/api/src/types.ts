import type { Db } from "@wasanni/db";
import type { Enqueuer } from "@wasanni/jobs";
import type { Env, Logger, ObjectStorage, SendEmail, SessionEventStore } from "@wasanni/kit";

export type AppDeps = {
  logger: Logger;
  version: string;
  startedAt: number;
  corsOrigins: string[];
  db: Db;
  env: Env;
  storage?: ObjectStorage;
  events?: SessionEventStore;
  enqueuer?: Enqueuer | null;
  ready: () => Promise<{ database: boolean; redis: boolean }>;
};

export type ModuleDeps = {
  db: Db;
  env: Env;
  logger: Logger;
  sendEmail?: SendEmail;
  enqueuer?: Enqueuer | null;
};
