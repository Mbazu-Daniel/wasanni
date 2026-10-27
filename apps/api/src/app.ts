import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { STATUS, toErrorBody } from "@wasanni/contracts";
import { authApiDocument, authRoutes } from "./modules/auth/index.ts";
import { createBetterAuth } from "./config/better-auth.ts";
import { principal, type PrincipalDeps } from "./plugins/principal.ts";
import { healthRoutes } from "./routes/health.ts";
import { failureOf } from "./failures.ts";
import { requestContext, requestContextOf } from "./plugins/request-context.ts";
import { platformRoutes } from "./modules/platform/index.ts";
import { platformService } from "./modules/platform/service.ts";
import { memberRoutes } from "./modules/member/index.ts";
import { memberService } from "./modules/member/service.ts";
import { apiKeyRoutes } from "./modules/api-key/index.ts";
import { apiKeyService } from "./modules/api-key/service.ts";
import { AUTH_ROUTE_PREFIX, DOCS_PATH } from "./constants.ts";
import type { AppDeps, ModuleDeps } from "./types.ts";

export async function createApp(deps: AppDeps) {
  const moduleDeps: ModuleDeps = { db: deps.db, env: deps.env, logger: deps.logger };
  const betterAuth = createBetterAuth(moduleDeps);

  const principalDeps: PrincipalDeps = { db: deps.db, auth: betterAuth };
  const base = principal(principalDeps);

  return new Elysia({ name: "wasanni-api" })
    .use(requestContext(deps.logger))
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
          ...(await authApiDocument(betterAuth)),
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
    .use(authRoutes(base, betterAuth))
    .use(memberRoutes(base, { service: memberService(deps.db), env: deps.env }))
    .use(platformRoutes(base, { service: platformService(deps.db) }))
    .use(apiKeyRoutes(base, { service: apiKeyService(deps.db) }))
    .use(healthRoutes(deps))
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
