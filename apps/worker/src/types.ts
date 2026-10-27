import type { Db } from "@wasanni/db";
import type {
  Env,
  Logger,
  ObjectStorage,
  SessionEventStore,
} from "@wasanni/kit";
import type { AuditService } from "../../api/src/modules/audit/service.ts";

export type SweepResult = {
  expiredSessions: number;
  purgedAuthSessions: number;
  purgedVerifications: number;
};

export type Block = {
  scoreId: string;
  offset: number;
  length: number;
  rows: number;
};

export type ScoreArchivePartition = {
  name: string;
};

export type ScoreArchiveRow = {
  id: string;
  organization_id: string;
  session_id: string;
  platform_id: string;
  game_id: string;
  external_user_id: string;
  mode: string | null;
  score: string | number;
  status: string;
  flagged: boolean;
  flags: string[];
  source: string;
  archive_key: string | null;
  archive_offset: string | null;
  archive_length: string | null;
  archive_rows: number | null;
  submitted_at: Date | string;
};

export type ArchiveWorkerDeps = {
  db: Db;
  storage: ObjectStorage;
  events: SessionEventStore;
  audit: AuditService;
  env: Env;
  logger: Logger;
};
