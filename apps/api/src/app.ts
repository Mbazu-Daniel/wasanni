import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { STATUS, toErrorBody } from "@wasanni/contracts";
import {
  createMemorySessionEventStore,
  createMetrics,
  createObjectStorage,
  readStorageConfig,
  readStorageLimits,
} from "@wasanni/kit";
import { buildAuthApiDocument, createAuthRoutes } from "./modules/auth/index.ts";
import { createBetterAuth } from "./config/better-auth.ts";
import { createPrincipalPlugin } from "./plugins/principal.ts";
import { createRateLimiter } from "./plugins/rate-limit.ts";
import type { PrincipalDeps } from "./plugins/types.ts";
import { createHealthRoutes } from "./routes/health.ts";
import { failureOf } from "./failures.ts";
import { createRequestContextPlugin, requestContextOf } from "./plugins/request-context.ts";
import { createPlatformRoutes } from "./modules/platform/index.ts";
import { createPlatformService } from "./modules/platform/service.ts";
import { createMemberRoutes } from "./modules/member/index.ts";
import { createMemberService } from "./modules/member/service.ts";
import { createApiKeyRoutes } from "./modules/api-key/index.ts";
import { createApiKeyService } from "./modules/api-key/service.ts";
import { createGamesRoutes } from "./modules/games/index.ts";
import { createTemplatesRoutes } from "./modules/templates/index.ts";
import { createPlayRoutes } from "./modules/play/index.ts";
import { createCompetition } from "./modules/competition/index.ts";
import { createAuditRoutes } from "./modules/audit/index.ts";
import { createAuditService } from "./modules/audit/service.ts";
import { createAuditPlugin } from "./plugins/audit.ts";
import { createWebhooksRoutes } from "./modules/webhook/index.ts";
import { createWebhookDispatcher } from "./modules/webhook/webhook-dispatcher.ts";
import {
  AUTH_ROUTE_PREFIX,
  DOCS_PATH,
  LEADERBOARD_RATE_LIMIT_PER_MINUTE,
  METRICS_PATH,
} from "./constants.ts";
import type { AppDeps, ModuleDeps } from "./types.ts";

const ROUTE_ID = /^[a-z]{3}_[A-Za-z0-9]+$/;

const routeLabel = (path: string): string =>
  path
    .replace(/\/org_[A-Za-z0-9]+/g, "/:organizationId")
    .split("/")
    .map((segment) => (ROUTE_ID.test(segment) ? ":id" : segment))
    .join("/");

export async function createApp(deps: AppDeps) {
  const audit = createAuditService(deps.db, deps.logger);

  const moduleDeps: ModuleDeps = {
    db: deps.db,
    env: deps.env,
    logger: deps.logger,
    audit,
    enqueuer: deps.enqueuer ?? null,
  };
  const betterAuth = createBetterAuth(moduleDeps);

  const principalDeps: PrincipalDeps = { db: deps.db, auth: betterAuth };
  const base = createPrincipalPlugin(principalDeps);

  const rateLimit = createRateLimiter(
    deps.redis ?? null,
    {
      scoreSubmit: {
        limit: deps.env.SCORE_RATE_LIMIT_PER_MINUTE,
        windowMs: 60_000,
        key: ({ sessionPrincipal }) =>
          sessionPrincipal === undefined ? null : `rl:score:${sessionPrincipal.sessionId}`,
      },
      sessionCreate: {
        limit: deps.env.SESSION_RATE_LIMIT_PER_MINUTE,
        windowMs: 60_000,
        key: ({ principal }) =>
          principal?.kind === "platform" ? `rl:sess:${principal.apiKeyId}` : null,
      },
      leaderboardRead: {
        limit: LEADERBOARD_RATE_LIMIT_PER_MINUTE,
        windowMs: 60_000,
        key: ({ principal }) =>
          principal?.kind === "platform" ? `rl:lb:${principal.apiKeyId}` : null,
      },
    },
    deps.logger,
  );

  const metrics = createMetrics();
  metrics.counter("wasanni_http_requests_total", "HTTP requests handled by the API");

  const storage = deps.storage ?? createObjectStorage(readStorageConfig(deps.env));
  const events = deps.events ?? createMemorySessionEventStore();
  const enqueuer = deps.enqueuer ?? null;
  const dispatcher = createWebhookDispatcher(deps.db, enqueuer);
  const competition = createCompetition(deps.db);

  return new Elysia({ name: "wasanni-api" })
    .use(createRequestContextPlugin(deps.logger))
    .use(
      cors({
        origin: deps.corsOrigins,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Request-Id",
          "X-API-Key",
        ],
        exposeHeaders: ["X-Request-Id", "Set-Cookie"],
      }),
    )
    .use(
      openapi({
        path: DOCS_PATH,
        exclude: { paths: [`${AUTH_ROUTE_PREFIX}/*`] },
        documentation: {
          ...(await buildAuthApiDocument(betterAuth)),
          info: {
            title: "Wasanni API",
            version: deps.version,
            description: "Sessions, scores, tournaments, and replays for games.",
          },
        },
      }),
    )
    .onError(({ error, code: lifecycleCode, set, request }) => {
      const { requestId } = requestContextOf(request);

      if (lifecycleCode === "VALIDATION") {
        set.status = 422;
        return toErrorBody(
          {
            code: "bad_request",
            message: "request validation failed",
            details: (error as { all?: unknown }).all,
          },
          requestId,
        );
      }

      if (lifecycleCode === "NOT_FOUND") {
        set.status = 404;
        return toErrorBody({ code: "not_found", message: "route not found" }, requestId);
      }

      const failure = failureOf(error);
      if (failure.status === STATUS.internal) {
        deps.logger.error("unhandled error", { err: error, requestId });
      }

      set.status = failure.status;
      return toErrorBody(failure.source, requestId);
    })
    .use(createAuditPlugin(audit))
    .use(createAuthRoutes(base, betterAuth))
    .use(createMemberRoutes(base, { service: createMemberService(deps.db), storage }))
    .use(createPlatformRoutes(base, { service: createPlatformService(deps.db) }))
    .use(createApiKeyRoutes(base, { service: createApiKeyService(deps.db) }))
    .use(
      createGamesRoutes(base, {
        db: deps.db,
        storage,
        config: readStorageLimits(deps.env),
        enqueuer,
        onConfigChanged: async (input) => {
          await enqueuer?.scoreRecheck(input);
        },
      }),
    )
    .use(
      createTemplatesRoutes(base, {
        db: deps.db,
        storage,
        config: readStorageLimits(deps.env),
      }),
    )
    .use(
      createWebhooksRoutes(base, {
        db: deps.db,
        encryptionKey: deps.env.WEBHOOK_SECRET_ENCRYPTION_KEY,
      }),
    )
    .use(competition.mount(base))
    .use(
      createPlayRoutes(base, {
        db: deps.db,
        storage,
        events,
        dispatcher,
        enqueuer,
        realtimeBaseUrl: deps.env.REALTIME_PUBLIC_URL,
        matchRecorder: competition.matches,
        rateLimit,
      }),
    )
    .use(createHealthRoutes(deps))
    .get(
      METRICS_PATH,
      ({ set }) => {
        set.headers["content-type"] = "text/plain; version=0.0.4; charset=utf-8";
        return metrics.render();
      },
      { detail: { tags: ["ops"], hide: true } },
    )
    .use(createAuditRoutes(base, { service: audit }))
    .onAfterResponse(({ request, set }) => {
      const { requestId, startedAt } = requestContextOf(request);
      const path = new URL(request.url).pathname;

      deps.logger.info("http", {
        requestId,
        method: request.method,
        path,
        status: set.status ?? 200,
        durationMs: Math.round(performance.now() - startedAt),
      });

      metrics.inc("wasanni_http_requests_total", {
        method: request.method,
        route: routeLabel(path),
        status: String(set.status ?? 200),
      });
    });
}
