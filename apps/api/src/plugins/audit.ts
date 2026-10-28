import { Elysia } from "elysia";
import type { Principal } from "@wasanni/kit";
import type { AuditAction, AuditResourceType, AuditVerb } from "@wasanni/contracts";
import type { AuditService } from "../modules/audit/types.ts";
import { principalOf } from "./principal.ts";

type AuditEventShape = { resourceType: AuditResourceType; action: AuditAction };

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const SKIPPED_PREFIXES = ["/api/v1/auth"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VERBS: Readonly<Record<string, AuditVerb>> = {
  POST: "created",
  PUT: "updated",
  PATCH: "updated",
  DELETE: "deleted",
};

const AGENT_ACTIONS: Readonly<Record<string, AuditEventShape>> = {
  "providers:POST": { resourceType: "agent_provider", action: "agent_provider.added" },
  "providers:PATCH": { resourceType: "agent_provider", action: "agent_provider.updated" },
  "providers:PUT": { resourceType: "agent_provider", action: "agent_provider.updated" },
  "providers:DELETE": { resourceType: "agent_provider", action: "agent_provider.removed" },
  "sessions:POST": { resourceType: "agent_session", action: "agent_session.started" },
  "sessions:PATCH": { resourceType: "agent_session", action: "agent_session.renamed" },
  "sessions:PUT": { resourceType: "agent_session", action: "agent_session.renamed" },
  "sessions:DELETE": { resourceType: "agent_session", action: "agent_session.deleted" },
};

const RESOURCE_TYPES: Readonly<Record<string, AuditResourceType>> = {
  assignments: "assignment",
  configs: "game_config",
  export: "export",
  files: "game_file",
  games: "game",
  join: "participant",
  keys: "key",
  leave: "participant",
  matches: "match",
  members: "member",
  participants: "participant",
  players: "player",
  platforms: "platform",
  quotas: "quota",
  register: "participant",
  roles: "role",
  sessions: "session",
  templates: "template",
  tournaments: "tournament",
  webhooks: "webhook",
  win: "match",
};

const ACTION_VERBS: Readonly<Record<string, AuditVerb>> = {
  "game:archive": "archived",
  "game_file:upload": "created",
  "match:win": "updated",
  "member:role": "role_changed",
  "tournament:cancel": "cancelled",
};

const segmentsOf = (pathname: string): string[] =>
  pathname.split("/").filter((segment) => segment !== "");

const resourceAt = (segments: string[]): number =>
  segments.findIndex(
    (segment, index) => index >= 2 && segment !== "organizations" && !isUuid(segment),
  );

const isUuid = (segment: string): boolean => UUID.test(segment);

const isCollection = (segment: string): boolean => RESOURCE_TYPES[segment] !== undefined;

const agentKeyOf = (segments: string[], resource: number): string =>
  segments
    .slice(resource + 1)
    .filter((segment) => !isUuid(segment))
    .join("/");

const resourceTypeOf = (segments: string[], from: number): AuditResourceType => {
  for (let index = segments.length - 1; index >= from; index -= 1) {
    const type = RESOURCE_TYPES[segments[index] ?? ""];
    if (type !== undefined) return type;
  }

  return "unknown";
};

const verbOf = (
  resourceType: AuditResourceType,
  segments: string[],
  method: string,
): AuditVerb => {
  const last = segments.at(-1) ?? "";
  const mapped = ACTION_VERBS[`${resourceType}:${last}`];
  if (mapped !== undefined) return mapped;
  if (isCollection(last) || isUuid(last)) return VERBS[method] ?? "updated";
  if (method === "DELETE") return "deleted";

  return "updated";
};

const genericEventOf = (
  resourceType: AuditResourceType,
  segments: string[],
  method: string,
): AuditEventShape => {
  const verb = verbOf(resourceType, segments, method);
  return { resourceType, action: `${resourceType}.${verb}` };
};

export const auditEventOf = (
  pathname: string,
  method: string,
): { event: AuditEventShape; resourceId: string | null } | undefined => {
  if (!MUTATING_METHODS.has(method)) return undefined;
  if (SKIPPED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return undefined;

  const segments = segmentsOf(pathname);
  const resource = resourceAt(segments);
  const resourceId = segments.slice(resource + 1).filter(isUuid).at(-1) ?? null;

  if (segments[resource] === "agents") {
    const event = AGENT_ACTIONS[`${agentKeyOf(segments, resource)}:${method}`];
    if (event === undefined) return undefined;
    return { event, resourceId };
  }

  const resourceType = resourceTypeOf(segments, resource);
  if (resourceType === "session") return undefined;

  return {
    event: genericEventOf(resourceType, segments, method),
    resourceId,
  };
};

const actorOf = (principal: Principal) =>
  principal.kind === "user"
    ? { type: "user" as const, userId: principal.userId }
    : { type: "api_key" as const, apiKeyId: principal.apiKeyId };

export const createAuditPlugin = (audit: AuditService) =>
  new Elysia({ name: "audit" }).onAfterResponse(
    { as: "global" },
    (context) => {
      const { request, set } = context;

      const pathname = new URL(request.url).pathname;
      const located = auditEventOf(pathname, request.method);
      if (located === undefined) return;

      const status = typeof set.status === "number" ? set.status : 200;
      if (status >= 400) return;

      const actor = (context as { principal?: Principal }).principal ?? principalOf(request);
      if (actor === undefined) return;

      void audit.record({
        organizationId: actor.organizationId,
        actor: actorOf(actor),
        source: "api",
        action: located.event.action,
        resourceType: located.event.resourceType,
        resourceId: located.resourceId,
        metadata: { method: request.method, path: pathname },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("cf-connecting-ip"),
        userAgent: request.headers.get("user-agent"),
      });
    },
  );
