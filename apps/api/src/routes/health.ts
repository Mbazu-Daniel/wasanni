import { Elysia } from "elysia";
import { HealthModel, ReadyModel } from "@wasanni/contracts";
import type { AppDeps } from "../types.ts";

export const createHealthRoutes = (deps: AppDeps) =>
  new Elysia({ name: "health" })
    .get(
      "/healthz",
      (): HealthModel => ({
        status: "ok",
        version: deps.version,
        uptimeSeconds: Math.round((Date.now() - deps.startedAt) / 1000),
      }),
      {
        detail: { tags: ["ops"], summary: "Liveness probe" },
        response: { 200: HealthModel },
      },
    )
    .get(
      "/readyz",
      async ({ set }): Promise<ReadyModel> => {
        const checks = await deps.ready();
        const healthy = checks.database && checks.redis;
        if (!healthy) set.status = 503;
        return { status: healthy ? "ready" : "degraded", checks };
      },
      {
        detail: { tags: ["ops"], summary: "Readiness probe" },
        response: { 200: ReadyModel, 503: ReadyModel },
      },
    );
