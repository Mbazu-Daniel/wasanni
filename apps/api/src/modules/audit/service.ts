import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AuditLogPage, AuditLogView } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import { auditLog, member, user } from "@wasanni/db/schema";
import type { Logger, Scope } from "@wasanni/kit";
import { afterCursor, decodeCursor, paginate } from "../../pagination.ts";
import { AUDIT_PAGE_DEFAULT, AUDIT_PAGE_MAX } from "./constants.ts";
import type { AuditEvent, AuditQuery } from "./types.ts";

type AuditRow = typeof auditLog.$inferSelect & {
  actorName: string | null;
  actorAvatar: string | null;
};

const toView = (row: AuditRow): AuditLogView => ({
  id: row.id,
  organizationId: row.organizationId,
  actorType: row.actorType,
  actorUserId: row.actorUserId,
  actorApiKeyId: row.actorApiKeyId,
  actorName: row.actorName,
  actorAvatar: row.actorAvatar,
  source: row.source,
  action: row.action,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  metadata: row.metadata,
  ipAddress: row.ipAddress,
  userAgent: row.userAgent,
  createdAt: row.createdAt.toISOString(),
});

export function createAuditService(db: Db, logger: Logger) {
  return {
    async record(event: AuditEvent): Promise<void> {
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

    async list(scope: Scope, query: AuditQuery): Promise<AuditLogPage> {
      const limit = Math.min(query.limit ?? AUDIT_PAGE_DEFAULT, AUDIT_PAGE_MAX);
      const cursor = query.cursor === undefined ? null : decodeCursor(query.cursor);

      const filters: (SQL | undefined)[] = [
        query.actorUserId === undefined ? undefined : eq(auditLog.actorUserId, query.actorUserId),
        query.actorApiKeyId === undefined
          ? undefined
          : eq(auditLog.actorApiKeyId, query.actorApiKeyId),
        query.action === undefined ? undefined : eq(auditLog.action, query.action),
        query.resourceType === undefined
          ? undefined
          : eq(auditLog.resourceType, query.resourceType),
        query.resourceId === undefined ? undefined : eq(auditLog.resourceId, query.resourceId),
        query.source === undefined ? undefined : eq(auditLog.source, query.source),
        query.from === undefined ? undefined : gte(auditLog.createdAt, query.from),
        query.to === undefined ? undefined : lte(auditLog.createdAt, query.to),
      ];

      if (cursor !== null) {
        filters.push(afterCursor(auditLog.createdAt, auditLog.id, cursor));
      }

      const rows = await db
        .select({
          id: auditLog.id,
          organizationId: auditLog.organizationId,
          actorType: auditLog.actorType,
          actorUserId: auditLog.actorUserId,
          actorApiKeyId: auditLog.actorApiKeyId,
          source: auditLog.source,
          action: auditLog.action,
          resourceType: auditLog.resourceType,
          resourceId: auditLog.resourceId,
          metadata: auditLog.metadata,
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          createdAt: auditLog.createdAt,
          actorName: sql<string | null>`coalesce(${member.name}, ${user.name})`.as("actor_name"),
          actorAvatar: sql<string | null>`coalesce(${member.avatar}, ${user.image})`.as("actor_avatar"),
        })
        .from(auditLog)
        .leftJoin(
          member,
          and(
            eq(member.userId, auditLog.actorUserId),
            eq(member.organizationId, auditLog.organizationId),
          ),
        )
        .leftJoin(user, eq(user.id, auditLog.actorUserId))
        .where(scopeTo(scope, auditLog, ...filters))
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(limit + 1);

      const { items, page } = paginate(rows, limit);

      return {
        data: items.map(toView),
        page,
      };
    },
  };
}
