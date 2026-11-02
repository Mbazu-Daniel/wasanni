import type { Logger } from "@wasanni/kit";
import { auditLog } from "./schema/index.ts";
import type { AuditRecorder, Db } from "./types.ts";

export function createAuditRecorder(db: Db, logger: Logger): AuditRecorder {
  return {
    async record(event) {
      try {
        await db.insert(auditLog).values({
          organizationId: event.organizationId,
          actorType: event.actor.type,
          actorUserId: event.actor.type === "user" ? event.actor.userId : null,
          actorApiKeyId: event.actor.type === "api_key" ? event.actor.apiKeyId : null,
          source: event.source,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId ?? null,
          metadata: event.metadata ?? {},
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
        });
      } catch (error) {
        logger.warn("audit write failed", {
          action: event.action,
          resourceType: event.resourceType,
          err: error,
        });
      }
    },
  };
}
