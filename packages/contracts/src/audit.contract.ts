import { t, type UnwrapSchema } from "elysia";

export const AUDIT_ACTOR_TYPES = ["user", "api_key", "system"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_SOURCES = ["auth", "organization", "api"] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

export const AuditActorTypeModel = t.Union([
  t.Literal("user"),
  t.Literal("api_key"),
  t.Literal("system"),
]);

export const AuditSourceModel = t.Union([
  t.Literal("auth"),
  t.Literal("organization"),
  t.Literal("api"),
]);

export const AuditLogView = t.Object({
  id: t.String(),
  organizationId: t.Union([t.String(), t.Null()]),
  actorType: AuditActorTypeModel,
  actorUserId: t.Union([t.String(), t.Null()]),
  actorApiKeyId: t.Union([t.String(), t.Null()]),
  source: AuditSourceModel,
  action: t.String(),
  resourceType: t.String(),
  resourceId: t.Union([t.String(), t.Null()]),
  metadata: t.Unknown(),
  ipAddress: t.Union([t.String(), t.Null()]),
  userAgent: t.Union([t.String(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
});
export type AuditLogView = UnwrapSchema<typeof AuditLogView>;

export const AuditLogPage = t.Object({
  data: t.Array(AuditLogView),
  page: t.Object({
    limit: t.Number(),
    hasMore: t.Boolean(),
    cursor: t.Union([t.String(), t.Null()]),
  }),
});
export type AuditLogPage = UnwrapSchema<typeof AuditLogPage>;

export const AuditLogQuery = t.Object({
  actorUserId: t.Optional(t.String()),
  actorApiKeyId: t.Optional(t.String()),
  action: t.Optional(t.String()),
  resourceType: t.Optional(t.String()),
  resourceId: t.Optional(t.String()),
  source: t.Optional(AuditSourceModel),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
  cursor: t.Optional(t.String()),
});
export type AuditLogQuery = UnwrapSchema<typeof AuditLogQuery>;
