import { desc, eq, gte, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AuditLogPage, AuditLogView } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import { auditLog } from "@wasanni/db/schema";
import type { Logger, Scope } from "@wasanni/kit";
import { AUDIT_PAGE_DEFAULT, AUDIT_PAGE_MAX } from "./constants.ts";
import type { AuditEvent, AuditQuery } from "./types.ts";

type AuditRow = typeof auditLog.$inferSelect;

const toView = (row: AuditRow): AuditLogView => ({
  id: row.id,
  organizationId: row.organizationId,
  actorType: row.actorType,
  actorUserId: row.actorUserId,
  actorApiKeyId: row.actorApiKeyId,
  source: row.source,
  action: row.action,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  metadata: row.metadata,
  ipAddress: row.ipAddress,
  userAgent: row.userAgent,
  createdAt: row.createdAt.toISOString(),
});

const encodeCursor = (row: AuditRow): string =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, "utf8").toString("base64url");

const decodeCursor = (cursor: string): { createdAt: Date; id: string } | null => {
  const [createdAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");

  if (createdAt === undefined || id === undefined) return null;

  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return null;

  return { createdAt: parsed, id };
};

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
        const cursorAt = cursor.createdAt.toISOString();

        filters.push(
          sql`(date_trunc('milliseconds', ${auditLog.createdAt}), ${auditLog.id}) < (date_trunc('milliseconds', ${cursorAt}::timestamptz), ${cursor.id}::uuid)`,
        );
      }

      const rows = await db
        .select()
        .from(auditLog)
        .where(scopeTo(scope, auditLog, ...filters))
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page.at(-1);

      return {
        data: page.map(toView),
        page: {
          limit,
          hasMore,
          cursor: hasMore && last !== undefined ? encodeCursor(last) : null,
        },
      };
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
