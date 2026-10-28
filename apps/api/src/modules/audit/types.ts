import type { AuditSource } from "@wasanni/contracts";
import type { AuditService } from "./service.ts";

export type AuditActor =
  | { type: "user"; userId: string }
  | { type: "api_key"; apiKeyId: string }
  | { type: "system" };

export type AuditEvent = {
  organizationId: string | null;
  actor: AuditActor;
  source: AuditSource;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditRouteDeps = {
  service: AuditService;
};

export type AuditQuery = {
  actorUserId?: string;
  actorApiKeyId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  source?: AuditSource;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
};
