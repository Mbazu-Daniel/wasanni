import { t, type UnwrapSchema } from "elysia";

export const AUDIT_ACTOR_TYPES = ["user", "api_key", "system"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_SOURCES = ["auth", "organization", "api", "worker", "agent"] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

export const AUDIT_RESOURCE_TYPES = [
  "account",
  "agent_provider",
  "agent_session",
  "assignment",
  "export",
  "game",
  "game_config",
  "game_file",
  "invitation",
  "key",
  "match",
  "member",
  "organization",
  "participant",
  "player",
  "platform",
  "quota",
  "role",
  "score",
  "score_partition",
  "session",
  "template",
  "tournament",
  "unknown",
  "user",
  "webhook",
] as const;
export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export const AUDIT_VERBS = [
  "accepted",
  "added",
  "archived",
  "cancelled",
  "created",
  "deleted",
  "linked",
  "removed",
  "renamed",
  "rejected",
  "revoked",
  "role_changed",
  "started",
  "unlinked",
  "updated",
] as const;
export type AuditVerb = (typeof AUDIT_VERBS)[number];

export type AuditAction = `${AuditResourceType}.${AuditVerb}`;

const CRUD: readonly AuditVerb[] = ["created", "updated", "deleted"];

export const AUDIT_ACTIONS = {
  account: ["linked", "unlinked"],
  agent_provider: ["added", "updated", "removed"],
  agent_session: ["started", "renamed", "deleted"],
  assignment: CRUD,
  export: ["created"],
  game: [...CRUD, "archived"],
  game_config: CRUD,
  game_file: CRUD,
  invitation: ["created", "accepted", "cancelled", "rejected"],
  key: CRUD,
  match: CRUD,
  member: [...CRUD, "added", "removed", "role_changed"],
  organization: CRUD,
  participant: CRUD,
  player: ["updated"],
  platform: CRUD,
  quota: ["created", "updated", "deleted"],
  role: CRUD,
  score: ["created"],
  score_partition: ["archived"],
  session: ["created", "revoked"],
  template: CRUD,
  tournament: [...CRUD, "cancelled"],
  unknown: CRUD,
  user: CRUD,
  webhook: CRUD,
} as const satisfies Record<AuditResourceType, readonly AuditVerb[]>;

export const AuditActorTypeModel = t.Union([
  t.Literal("user"),
  t.Literal("api_key"),
  t.Literal("system"),
]);

export const AuditSourceModel = t.Union([
  t.Literal("auth"),
  t.Literal("organization"),
  t.Literal("api"),
  t.Literal("worker"),
  t.Literal("agent"),
]);

export const AuditLogView = t.Object({
  id: t.String(),
  organizationId: t.Union([t.String(), t.Null()]),
  actorType: AuditActorTypeModel,
  actorUserId: t.Union([t.String(), t.Null()]),
  actorApiKeyId: t.Union([t.String(), t.Null()]),
  actorName: t.Union([t.String(), t.Null()]),
  actorAvatar: t.Union([t.String(), t.Null()]),
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
