import {
  OrganizationIdParams,
  UsageDailyQuery,
  UsageDailyView,
  UsageStorageView,
  PERMISSION,
  PlatformUsageView,
  SetUsageQuotaBody,
  UsageParams,
  UsageQuery,
  UsageQuotaList,
  UsageQuotaParams,
  UsageView,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { currentPeriodStart, periodEnd } from "./usage.service.ts";
import type { UsageService } from "./types.ts";

export const createUsageRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: { service: UsageService },
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/usage",
      async ({ principal, query }) => {
        const scope = organizationScope(principal);
        const period = query.period === undefined
          ? currentPeriodStart()
          : new Date(`${query.period}-01T00:00:00.000Z`);

        const [counters, storageBytes] = await Promise.all([
          service.listForPeriod(scope.organizationId, period),
          service.storageBytes(scope.organizationId),
        ]);

        return {
          period: { start: period.toISOString(), end: periodEnd(period).toISOString() },
          counters,
          storageBytes,
        };
      },
      {
        organizationAuth: PERMISSION.auditRead,
        params: UsageParams,
        query: UsageQuery,
        response: { 200: UsageView },
        detail: { tags: ["usage"], summary: "Read the usage of an organization" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/usage/daily",
      async ({ principal, query }) => {
        const rows = await service.dailyBreakdown({
          organizationId: principal.organizationId,
          metric: query.metric,
          from: new Date(query.from),
          to: new Date(query.to),
        });

        return { metric: query.metric, rows };
      },
      {
        organizationAuth: PERMISSION.auditRead,
        params: UsageParams,
        query: UsageDailyQuery,
        response: { 200: UsageDailyView },
        detail: { tags: ["usage"], summary: "Daily breakdown for a metric" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/usage/storage",
      async ({ principal }) => service.storageBreakdown(principal.organizationId),
      {
        organizationAuth: PERMISSION.auditRead,
        params: UsageParams,
        response: { 200: UsageStorageView },
        detail: { tags: ["usage"], summary: "Storage breakdown by game and template" },
      },
    )
    .get(
      "/api/v1/platform/usage",
      async ({ principal, query }) => {
        const scope = organizationScope(principal);
        const period = query.period === undefined
          ? currentPeriodStart()
          : new Date(`${query.period}-01T00:00:00.000Z`);

        const [sessions, scores, matches, tournaments] = await Promise.all([
          service.read({
            organizationId: scope.organizationId,
            platformId: principal.platformId,
            metric: "sessions_created",
            period,
          }),
          service.read({
            organizationId: scope.organizationId,
            platformId: principal.platformId,
            metric: "scores_submitted",
            period,
          }),
          service.read({
            organizationId: scope.organizationId,
            platformId: principal.platformId,
            metric: "matches_created",
            period,
          }),
          service.read({
            organizationId: scope.organizationId,
            platformId: principal.platformId,
            metric: "tournaments_created",
            period,
          }),
        ]);

        return {
          period: { start: period.toISOString(), end: periodEnd(period).toISOString() },
          counters: {
            sessions_created: sessions,
            scores_submitted: scores,
            matches_created: matches,
            tournaments_created: tournaments,
          },
        };
      },
      {
        platformAuth: PERMISSION.auditRead,
        response: { 200: PlatformUsageView },
        detail: { tags: ["usage"], summary: "Read the usage of the calling platform" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/quotas",
      async ({ principal }) => ({
        quotas: await service.listQuotas(organizationScope(principal).organizationId),
      }),
      {
        organizationAuth: PERMISSION.auditRead,
        params: OrganizationIdParams,
        response: { 200: UsageQuotaList },
        detail: { tags: ["usage"], summary: "List the quotas of an organization" },
      },
    )
    .put(
      "/api/v1/organizations/:organizationId/quotas",
      async ({ principal, body, status }) => {
        await service.setQuota({
          organizationId: organizationScope(principal).organizationId,
          metric: body.metric,
          limitValue: body.limitValue,
        });
        return status(204);
      },
      {
        organizationAuth: PERMISSION.organizationUpdate,
        params: OrganizationIdParams,
        body: SetUsageQuotaBody,
        detail: { tags: ["usage"], summary: "Set a monthly quota" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/quotas/:metric",
      async ({ principal, params, status }) => {
        await service.removeQuota(
          organizationScope(principal).organizationId,
          params.metric as never,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.organizationUpdate,
        params: UsageQuotaParams,
        detail: { tags: ["usage"], summary: "Remove a monthly quota" },
      },
    );
