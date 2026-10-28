import { Elysia } from "elysia";
import { HealthModel, ReadyModel, REALTIME_PATH, toErrorBody } from "@wasanni/contracts";
import { AppError, internal, unauthenticated } from "@wasanni/kit";
import { resolveRealtimeSession } from "./auth.ts";
import { createGateway } from "./gateway.ts";
import type { RealtimeContext, RealtimeDeps, RealtimeSession } from "./types.ts";

const sessionOf = (frame: unknown): RealtimeSession => {
  const session = (frame as RealtimeContext).realtimeSession;

  if (session === undefined) throw internal("realtime socket is missing its session");

  return session;
};

export function createRealtimeApp(deps: RealtimeDeps) {
  const gateway = createGateway(deps);

  return new Elysia({
    name: "wasanni-realtime",
    websocket: {
      idleTimeout: deps.idleTimeoutSeconds,
      maxPayloadLength: deps.maxMessageBytes,
    },
  })
    .ws(`${REALTIME_PATH}/:sessionId`, {
      async beforeHandle(context) {
        const sessionId = (context.params as { sessionId?: string }).sessionId;

        if (sessionId === undefined) throw unauthenticated("a session id is required");

        const session = await resolveRealtimeSession(deps.db, sessionId, context.request);

        (context as RealtimeContext).realtimeSession = session;
      },

      open(ws) {
        gateway.connect(ws, sessionOf(ws.data));
      },

      async message(ws, raw) {
        await gateway.message(ws, raw, sessionOf(ws.data));
      },

      close(ws) {
        gateway.close(ws, sessionOf(ws.data));
      },
    })
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
    )
    .onError(({ error, code, set, request }) => {
      const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

      if (error instanceof AppError) {
        if (error.status >= 500) deps.logger.error("realtime error", { err: error });
        set.status = error.status;
        return toErrorBody({ code: error.code, message: error.message }, requestId);
      }

      if (code === "NOT_FOUND") {
        set.status = 404;
        return toErrorBody(
          { code: "not_found", message: "route not found" },
          requestId,
        );
      }

      deps.logger.error("realtime error", { err: error });
      set.status = 500;
      return toErrorBody({ code: "internal", message: "internal error" }, requestId);
    });
}
