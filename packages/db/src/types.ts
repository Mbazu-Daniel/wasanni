import type {
  AuditAction,
  AuditResourceType,
  AuditSource,
  GameSessionStatus,
} from "@wasanni/contracts";
import type { createDb } from "./client.ts";

export type Db = ReturnType<typeof createDb>["db"];

export type DbExecutor = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type ApiKeyCredential = {
  id: string;
  referenceId: string;
  permissions: string | null;
  metadata: string | null;
};

export type MembershipRow = {
  memberId: string;
  role: string;
  name: string | null;
};

export type GameSessionCredential = {
  id: string;
  organizationId: string;
  platformId: string;
  gameId: string;
  externalUserId: string;
  mode: string | null;
  status: GameSessionStatus;
  expiresAt: Date;
};

export type AuditActor =
  | { type: "user"; userId: string }
  | { type: "api_key"; apiKeyId: string }
  | { type: "system" };

export type AuditEvent = {
  organizationId: string | null;
  actor: AuditActor;
  source: AuditSource;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditRecorder = {
  record(event: AuditEvent): Promise<void>;
};
