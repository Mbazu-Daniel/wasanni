import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { STATUS, toErrorBody } from "@wasanni/contracts";
import {
  createMemorySessionEventStore,
  createObjectStorage,
  readStorageConfig,
  readStorageLimits,
} from "@wasanni/kit";
import { buildAuthApiDocument, createAuthRoutes } from "./modules/auth/index.ts";
import { createBetterAuth } from "./config/better-auth.ts";
import { createPrincipalPlugin, type PrincipalDeps } from "./plugins/principal.ts";
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
import { createWebhooksRoutes } from "./modules/webhook/index.ts";
import { createWebhookDispatcher } from "./modules/webhook/webhook-dispatcher.ts";
import { AUTH_ROUTE_PREFIX, DOCS_PATH } from "./constants.ts";
import type { AppDeps, ModuleDeps } from "./types.ts";

export async function createApp(deps: AppDeps) {
  const moduleDeps: ModuleDeps = {
    db: deps.db,
    env: deps.env,
    logger: deps.logger,
    enqueuer: deps.enqueuer ?? null,
  };
  const betterAuth = createBetterAuth(moduleDeps);

  const principalDeps: PrincipalDeps = { db: deps.db, auth: betterAuth };
  const base = createPrincipalPlugin(principalDeps);

  const storage = deps.storage ?? createObjectStorage(readStorageConfig(deps.env));
  const events = deps.events ?? createMemorySessionEventStore();
  const enqueuer = deps.enqueuer ?? null;
  const dispatcher = createWebhookDispatcher(deps.db, enqueuer);

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
    .use(createAuthRoutes(base, betterAuth))
    .use(createMemberRoutes(base, { service: createMemberService(deps.db), storage }))
    .use(createPlatformRoutes(base, { service: createPlatformService(deps.db) }))
    .use(createApiKeyRoutes(base, { service: createApiKeyService(deps.db) }))
    .use(
      createGamesRoutes(base, {
        db: deps.db,
        storage,
        config: readStorageLimits(deps.env),
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
    .use(
      createPlayRoutes(base, {
        db: deps.db,
        storage,
        events,
        dispatcher,
        enqueuer,
        realtimeBaseUrl: deps.env.REALTIME_PUBLIC_URL,
      }),
    )
    .use(createHealthRoutes(deps))
    .onAfterResponse(({ request, set }) => {
      const { requestId, startedAt } = requestContextOf(request);
      deps.logger.info("http", {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        status: set.status ?? 200,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });
}

export type App = ReturnType<typeof createApp>;
