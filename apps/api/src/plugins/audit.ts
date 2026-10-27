import { Elysia } from "elysia";
import type { Principal } from "@wasanni/kit";
import type { AuditService } from "../modules/audit/types.ts";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const SKIPPED_PREFIXES = ["/api/v1/auth", "/api/v1/play", "/api/v1/platform/sessions"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VERBS: Readonly<Record<string, string>> = {
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
};

const segmentsOf = (pathname: string): string[] =>
  pathname.split("/").filter((segment) => segment !== "");

const resourceAt = (segments: string[]): number =>
  segments[2] === "organizations" ? 4 : 2;

const actorOf = (principal: Principal) =>
  principal.kind === "user"
    ? { type: "user" as const, userId: principal.userId }
    : { type: "api_key" as const, apiKeyId: principal.apiKeyId };

export const createAuditPlugin = (audit: AuditService) =>
  new Elysia({ name: "audit" }).onAfterResponse(
    { as: "global" },
    (context) => {
      const { request, set } = context;
      if (!MUTATING_METHODS.has(request.method)) return;

      const pathname = new URL(request.url).pathname;
      if (SKIPPED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

      const status = typeof set.status === "number" ? set.status : 200;
      if (status >= 400) return;

      const actor = (context as { principal?: Principal }).principal;
      if (actor === undefined) return;

      const segments = segmentsOf(pathname);
      const resource = resourceAt(segments);
      const resourceType = segments[resource] ?? "unknown";
      const resourceId =
        segments.slice(resource + 1).find((segment) => UUID.test(segment)) ?? null;

      void audit.record({
        organizationId: actor.organizationId,
        actor: actorOf(actor),
        source: "api",
        action: `${resourceType}.${VERBS[request.method] ?? request.method.toLowerCase()}`,
        resourceType,
        resourceId,
        metadata: { method: request.method, path: pathname },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("cf-connecting-ip"),
        userAgent: request.headers.get("user-agent"),
      });
    },
  );
