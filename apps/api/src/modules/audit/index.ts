import { AuditLogPage, AuditLogQuery, OrganizationIdParams, PERMISSION } from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { AuditRouteDeps } from "./types.ts";

export const createAuditRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: AuditRouteDeps,
) =>
  api.get(
    "/api/v1/organizations/:organizationId/audit",
    async ({ principal, query }) =>
      service.list(organizationScope(principal), {
        actorUserId: query.actorUserId,
        actorApiKeyId: query.actorApiKeyId,
        action: query.action,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        source: query.source,
        from: query.from === undefined ? undefined : new Date(query.from),
        to: query.to === undefined ? undefined : new Date(query.to),
        limit: query.limit,
        cursor: query.cursor,
      }),
    {
      organizationAuth: PERMISSION.auditRead,
      params: OrganizationIdParams,
      query: AuditLogQuery,
      response: { 200: AuditLogPage },
      detail: { tags: ["audit"], summary: "Read the audit trail" },
    },
  );
