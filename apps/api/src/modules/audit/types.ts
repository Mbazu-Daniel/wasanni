import type { AuditSource } from "@wasanni/contracts";
import type { createAuditService } from "./service.ts";

export type { AuditActor, AuditEvent } from "@wasanni/db";

export type AuditService = ReturnType<typeof createAuditService>;

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
