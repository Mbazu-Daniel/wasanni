import type { Db } from "@wasanni/db";
import type { Enqueuer } from "@wasanni/jobs";
import type {
  Env,
  Logger,
  ObjectStorage,
  Redis,
  SendEmail,
  SessionEventStore,
} from "@wasanni/kit";
import type { ErrorSource } from "@wasanni/contracts";
import type { AuditService } from "./modules/audit/types.ts";

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
  redis?: Redis | null;
  ready: () => Promise<{ database: boolean; redis: boolean }>;
};

export type ModuleDeps = {
  db: Db;
  env: Env;
  logger: Logger;
  audit: AuditService;
  sendEmail?: SendEmail;
  enqueuer?: Enqueuer | null;
};

export type Failure = { status: number; source: ErrorSource };

export type DelegatedError = {
  name?: string;
  body?: { code?: string; message?: string };
};
