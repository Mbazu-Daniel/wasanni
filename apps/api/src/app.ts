import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { AppError } from "@wasanni/kit";
import { toErrorBody } from "@wasanni/contracts";
import { authApiDocument, authRoutes } from "./modules/auth/index.ts";
import { organizationRoutes } from "./modules/organization/index.ts";
import { organizationService } from "./modules/organization/service.ts";
import { memberRoutes } from "./modules/members/index.ts";
import { memberService } from "./modules/members/service.ts";
import { createBetterAuth } from "./config/better-auth.ts";
import { principal, type PrincipalDeps } from "./plugins/principal.ts";
import { healthRoutes } from "./routes/health.ts";
import { requestContext, requestContextOf } from "./plugins/request-context.ts";
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
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
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
    .use(authRoutes(base, betterAuth))
    .use(memberRoutes(base, { auth: betterAuth, service: memberService(deps.db) }))
    .use(organizationRoutes(base, { auth: betterAuth, service: organizationService(deps.db) }))
    .use(healthRoutes(deps))
    .onError(({ error, code: lifecycleCode, set, request }) => {
      const { requestId } = requestContextOf(request);

      if (error instanceof AppError) {
        set.status = error.status;
        return toErrorBody(error, requestId);
      }

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

      deps.logger.error("unhandled error", { err: error, requestId });
      set.status = 500;
      return toErrorBody({ code: "internal", message: "internal error" }, requestId);
    })
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
