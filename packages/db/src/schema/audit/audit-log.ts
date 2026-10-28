import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AuditActorType, AuditSource } from "@wasanni/contracts";
import { organization } from "../organization/organization.ts";
import { user } from "../identity/user.ts";
import { apiKey } from "../api-key/api-key.ts";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    actorType: text("actor_type").notNull().$type<AuditActorType>(),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorApiKeyId: uuid("actor_api_key_id").references(() => apiKey.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull().$type<AuditSource>(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_org_created_ix").on(t.organizationId, t.createdAt),
    index("audit_log_actor_created_ix").on(t.actorUserId, t.createdAt),
    index("audit_log_resource_ix").on(t.resourceType, t.resourceId),
    index("audit_log_action_ix").on(t.action),
  ],
);
