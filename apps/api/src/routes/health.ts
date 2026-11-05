import { Elysia } from "elysia";
import { HealthModel, ReadyModel } from "@wasanni/contracts";
import type { AppDeps } from "../types.ts";

export const createHealthRoutes = (deps: AppDeps) =>
  new Elysia({ name: "health" })
    .get(
      "/",
      () =>
        new Response(
          `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Wasanni API</title></head><body><h1>welcome to wasanni</h1><ul><li><a href="/healthz">health</a></li><li><a href="/readyz">readiness</a></li><li><a href="/docs">docs</a></li><li><a href="/docs/json">openapi json</a></li></ul></body></html>`,
          { headers: { "content-type": "text/html; charset=utf-8" } },
        ),
      {
        detail: { tags: ["ops"], summary: "API landing page" },
      },
    )
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
