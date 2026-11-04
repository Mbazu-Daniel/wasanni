import { and, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameFile, platform } from "@wasanni/db/schema";
import { NotFoundError, resolveContent, type ObjectStorage } from "@wasanni/kit";
import type { Redis } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { currentPeriodStart } from "../usage/usage.service.ts";
import type { UsageService } from "../usage/types.ts";

const IMMUTABLE = "public, max-age=31536000, immutable";

export const bandwidthKey = (organizationId: string, period: Date): string =>
  `usage:live:bandwidth:${organizationId}:${period.toISOString()}`;

const crossOriginHeaders = (enabled: boolean): Record<string, string> =>
  enabled
    ? {
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-embedder-policy": "require-corp",
        "cross-origin-resource-policy": "cross-origin",
      }
    : { "cross-origin-resource-policy": "cross-origin" };

type ServedRow = {
  organizationId: string;
  kind: "single" | "bundle";
  entryPoint: string;
  objectKey: string;
  servedPrefix: string | null;
  spaFallback: boolean;
  crossOriginIsolation: boolean;
};

type ServeDeps = {
  storage: ObjectStorage;
  usage: UsageService | null;
  redis: Redis | null;
};

const serveRow = async (
  deps: ServeDeps,
  row: ServedRow,
  requestedPath: string,
  request: Request,
  cache: "immutable" | "fresh" = "immutable",
) => {
  if (row.kind === "single" && requestedPath !== row.entryPoint) {
    throw new NotFoundError("game file not found");
  }

  const resolved = resolveContent(requestedPath);

  const key =
    row.kind === "single" ? row.objectKey : `${row.servedPrefix ?? ""}/${resolved.servedPath}`;

  const object = await deps.storage.getObjectStream(key, request.headers.get("range"));

  if (object === null) {
    if (row.kind === "bundle" && row.spaFallback && !requestedPath.includes(".")) {
      return serveEntryPoint(deps.storage, row, cache);
    }

    throw new NotFoundError("game file not found");
  }

  const bytes = object.contentLength ?? 0;

  if (bytes > 0 && deps.usage !== null) {
    await deps.usage.checkQuota({
      organizationId: row.organizationId,
      metric: "bandwidth_bytes",
      amount: bytes,
    });

    if (deps.redis !== null) {
      await deps.redis
        .incrby(bandwidthKey(row.organizationId, currentPeriodStart()), bytes)
        .catch(() => undefined);
    }
  }

  return new Response(object.stream, {
    status: object.status,
    headers: {
      "content-type": resolved.contentType,
      "cache-control": cache === "immutable" ? IMMUTABLE : "no-cache",
      "accept-ranges": "bytes",
      ...crossOriginHeaders(row.crossOriginIsolation),
      ...(object.contentEncoding === null
        ? {}
        : { "content-encoding": object.contentEncoding }),
      ...(object.etag === null ? {} : { etag: object.etag }),
      ...(object.contentLength === null
        ? {}
        : { "content-length": String(object.contentLength) }),
      ...(object.contentRange === null ? {} : { "content-range": object.contentRange }),
    },
  });
};

const serveEntryPoint = async (
  storage: ObjectStorage,
  row: { servedPrefix: string | null; entryPoint: string; crossOriginIsolation: boolean },
  cache: "immutable" | "fresh" = "immutable",
) => {
  const object = await storage.getObjectStream(`${row.servedPrefix ?? ""}/${row.entryPoint}`);

  if (object === null) throw new NotFoundError("game file not found");

  return new Response(object.stream, {
    status: 200,
    headers: {
      "content-type": resolveContent(row.entryPoint).contentType,
      "cache-control": cache === "immutable" ? "public, max-age=300" : "no-cache",
      ...crossOriginHeaders(row.crossOriginIsolation),
      ...(object.contentLength === null
        ? {}
        : { "content-length": String(object.contentLength) }),
    },
  });
};

const resolveNamedGame = async (db: Db, platformSlug: string, gameSlug: string) => {
  const namedPlatform = await db.query.platform.findFirst({
    where: eq(platform.slug, platformSlug),
  });

  if (namedPlatform === undefined) throw new NotFoundError("game file not found");

  const namedGame = await db.query.game.findFirst({
    where: and(
      eq(game.slug, gameSlug),
      eq(game.organizationId, namedPlatform.organizationId),
    ),
  });

  if (namedGame === undefined) throw new NotFoundError("game file not found");

  return { namedPlatform, namedGame };
};

export const createPlayRoutes = <T extends PrincipalApi>(
  api: T,
  db: Db,
  storage: ObjectStorage,
  usage: UsageService | null,
  redis: Redis | null,
) => {
  const deps: ServeDeps = { storage, usage, redis };

  return api
    .get(
      "/play/:gameId/:fileId/*",
      async ({ params, request }) => {
        const row = await db.query.gameFile.findFirst({
          where: and(
            eq(gameFile.id, params.fileId),
            eq(gameFile.gameId, params.gameId),
            eq(gameFile.status, "ready"),
          ),
        });

        if (row === undefined) throw new NotFoundError("game file not found");

        const requested = (params as { "*"?: string })["*"] ?? "";
        return serveRow(deps, row, requested === "" ? row.entryPoint : requested, request);
      },
      { detail: { tags: ["play"], summary: "Serve a game file" } },
    )
    .get(
      "/play/:gameId",
      async ({ params, request }) => playRedirect(db, params.gameId, "", request),
      {
        detail: { tags: ["play"], summary: "Redirect to the current build of a game" },
      },
    )
    .get(
      "/play/:gameId/*",
      async ({ params, request }) => {
        const rest = (params as { "*"?: string })["*"] ?? "";
        return playRedirect(db, params.gameId, rest, request);
      },
      {
        detail: { tags: ["play"], summary: "Redirect to the current build of a game" },
      },
    )
    .get(
      "/s/:platformSlug/:gameSlug/",
      async ({ params, request }) => {
        const { namedPlatform, namedGame } = await resolveNamedGame(
          db,
          params.platformSlug,
          params.gameSlug,
        );

        const current = await db.query.gameFile.findFirst({
          where: and(
            eq(gameFile.gameId, namedGame.id),
            eq(gameFile.platformId, namedPlatform.id),
            eq(gameFile.status, "ready"),
            eq(gameFile.isCurrent, true),
          ),
        });

        if (current === undefined) throw new NotFoundError("game file not found");

        return serveRow(deps, current, current.entryPoint, request, "fresh");
      },
      { detail: { tags: ["play"], summary: "Redirect to the current build of a game on a platform" } },
    )
    .get(
      "/s/:platformSlug/:gameSlug/*",
      async ({ params, request }) => {
        const { namedPlatform, namedGame } = await resolveNamedGame(
          db,
          params.platformSlug,
          params.gameSlug,
        );
        const rest = (params as { "*"?: string })["*"] ?? "";
        const single = /^(\d+)\.html$/.exec(rest);
        const bundled = /^(\d+)\/(.+)$/.exec(rest);

        if (single !== null) {
          const row = await db.query.gameFile.findFirst({
            where: and(
              eq(gameFile.gameId, namedGame.id),
              eq(
                gameFile.objectKey,
                `${namedPlatform.slug}/${namedGame.slug}/${single[1]}.html`,
              ),
              eq(gameFile.status, "ready"),
            ),
          });

          if (row === undefined || row.kind !== "single") {
            throw new NotFoundError("game file not found");
          }

          return serveRow(deps, row, row.entryPoint, request);
        }

        if (bundled !== null) {
          const row = await db.query.gameFile.findFirst({
            where: and(
              eq(gameFile.gameId, namedGame.id),
              eq(
                gameFile.objectKey,
                `${namedPlatform.slug}/${namedGame.slug}/${bundled[1]}.zip`,
              ),
              eq(gameFile.status, "ready"),
            ),
          });

          if (row === undefined || row.kind !== "bundle") {
            throw new NotFoundError("game file not found");
          }

          return serveRow(deps, row, bundled[2] as string, request);
        }

        const current = await db.query.gameFile.findFirst({
          where: and(
            eq(gameFile.gameId, namedGame.id),
            eq(gameFile.platformId, namedPlatform.id),
            eq(gameFile.status, "ready"),
            eq(gameFile.isCurrent, true),
          ),
        });

        if (current === undefined) throw new NotFoundError("game file not found");

        if (current.kind === "single") {
          if (rest !== current.entryPoint) throw new NotFoundError("game file not found");
          return serveRow(deps, current, current.entryPoint, request, "fresh");
        }

        return serveRow(deps, current, rest === "" ? current.entryPoint : rest, request, "fresh");
      },
      { detail: { tags: ["play"], summary: "Serve a timestamped build of a game on a platform" } },
    );
};

const playRedirect = async (db: Db, gameId: string, rest: string, request: Request) => {
  const current = await db.query.gameFile.findFirst({
    where: and(
      eq(gameFile.gameId, gameId),
      eq(gameFile.status, "ready"),
      eq(gameFile.isCurrent, true),
    ),
    orderBy: (file, { desc }) => [desc(file.createdAt)],
  });

  if (current === undefined) throw new NotFoundError("game file not found");

  const target = new URL(request.url);
  target.pathname = `/play/${gameId}/${current.id}/${rest}`;
  return Response.redirect(target.toString(), 307);
};
