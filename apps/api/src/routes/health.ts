import { Elysia } from "elysia";
import { EnvelopeModel } from "@wasanni/contracts";
import type { AppDeps } from "../types.ts";

export const healthRoutes = (deps: AppDeps) =>
  new Elysia({ name: "health" })
    .get(
      "/healthz",
      (): EnvelopeModel["health"] => ({
        status: "ok",
        version: deps.version,
        uptimeSeconds: Math.round((Date.now() - deps.startedAt) / 1000),
      }),
      {
        detail: { tags: ["ops"], summary: "Liveness probe" },
        response: { 200: EnvelopeModel.health },
      },
    )
    .get(
      "/readyz",
      async ({ set }): Promise<EnvelopeModel["ready"]> => {
        const checks = await deps.ready();
        const healthy = checks.database && checks.redis;
        if (!healthy) set.status = 503;
        return { status: healthy ? "ready" : "degraded", checks };
      },
      {
        detail: { tags: ["ops"], summary: "Readiness probe" },
        response: { 200: EnvelopeModel.ready, 503: EnvelopeModel.ready },
      },
    );
