import { and, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameFile } from "@wasanni/db/schema";
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

export const createPlayRoutes = <T extends PrincipalApi>(
  api: T,
  db: Db,
  storage: ObjectStorage,
  usage: UsageService | null,
  redis: Redis | null,
) =>
  api.get(
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
      const requestedPath = requested === "" ? row.entryPoint : requested;

      if (row.kind === "single" && requestedPath !== row.entryPoint) {
        throw new NotFoundError("game file not found");
      }

      const resolved = resolveContent(requestedPath);

      const key =
        row.kind === "single"
          ? row.objectKey
          : `${row.servedPrefix ?? ""}/${resolved.servedPath}`;

      const object = await storage.getObjectStream(key, request.headers.get("range"));

      if (object === null) {
        if (row.kind === "bundle" && row.spaFallback && !requestedPath.includes(".")) {
          return serveEntryPoint(storage, row);
        }

        throw new NotFoundError("game file not found");
      }

      const bytes = object.contentLength ?? 0;

      if (bytes > 0 && usage !== null) {
        await usage.checkQuota({
          organizationId: row.organizationId,
          metric: "bandwidth_bytes",
          amount: bytes,
        });

        if (redis !== null) {
          await redis
            .incrby(bandwidthKey(row.organizationId, currentPeriodStart()), bytes)
            .catch(() => undefined);
        }
      }

      return new Response(object.stream, {
        status: object.status,
        headers: {
          "content-type": resolved.contentType,
          "cache-control": IMMUTABLE,
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
    },
    { detail: { tags: ["play"], summary: "Serve a game file" } },
  );

const serveEntryPoint = async (
  storage: ObjectStorage,
  row: { servedPrefix: string | null; entryPoint: string; crossOriginIsolation: boolean },
) => {
  const object = await storage.getObjectStream(`${row.servedPrefix ?? ""}/${row.entryPoint}`);

  if (object === null) throw new NotFoundError("game file not found");

  return new Response(object.stream, {
    status: 200,
    headers: {
      "content-type": resolveContent(row.entryPoint).contentType,
      "cache-control": "public, max-age=300",
      ...crossOriginHeaders(row.crossOriginIsolation),
      ...(object.contentLength === null
        ? {}
        : { "content-length": String(object.contentLength) }),
    },
  });
};
