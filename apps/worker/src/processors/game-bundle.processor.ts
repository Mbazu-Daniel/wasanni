import { and, eq } from "drizzle-orm";
import { unzip } from "fflate";
import type { Db } from "@wasanni/db";
import { gameFile } from "@wasanni/db/schema";
import { BadRequestError, resolveContent, type Env, type Logger, type ObjectStorage } from "@wasanni/kit";
import type { GameBundleJob } from "@wasanni/jobs";

const IMMUTABLE = "public, max-age=31536000, immutable";

const normalizePath = (raw: string): string | null => {
  if (raw.includes("\\")) return null;
  if (raw.startsWith("/")) return null;

  const cleaned = raw.replace(/^\/+/, "");

  if (cleaned.length === 0) return null;
  if (cleaned.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    return null;
  }

  return cleaned;
};

const readZip = (zip: Uint8Array): Promise<Record<string, Uint8Array>> =>
  new Promise((resolve, reject) => {
    unzip(zip, (error, entries) => (error === null ? resolve(entries) : reject(error)));
  });

export function createGameBundleProcessor(
  db: Db,
  storage: ObjectStorage,
  env: Env,
  logger: Logger,
) {
  const fail = async (fileId: string): Promise<void> => {
    await db.update(gameFile).set({ status: "failed" }).where(eq(gameFile.id, fileId));
  };

  return async function extract(job: GameBundleJob): Promise<{ files: number }> {
    const row = await db.query.gameFile.findFirst({
      where: and(
        eq(gameFile.id, job.fileId),
        eq(gameFile.organizationId, job.organizationId),
      ),
    });

    if (row === undefined) throw new Error("game file not found");
    if (row.kind !== "bundle" || row.status === "ready") return { files: 0 };

    await db
      .update(gameFile)
      .set({ status: "extracting" })
      .where(eq(gameFile.id, row.id));

    const zip = await storage.getObjectRange({
      key: row.objectKey,
      offset: 0,
      length: row.sizeBytes,
    });

    const entries = await readZip(zip).catch(async (error: unknown) => {
      await fail(row.id);
      throw new BadRequestError("the bundle is not a readable zip", { cause: error });
    });

    const files: {
      path: string;
      body: Uint8Array;
      contentType: string;
      contentEncoding: string | null;
    }[] = [];

    let uncompressed = 0;

    for (const [rawPath, body] of Object.entries(entries)) {
      if (rawPath.endsWith("/")) continue;

      const path = normalizePath(rawPath);

      if (path === null) {
        await fail(row.id);
        throw new BadRequestError("unsafe path in bundle");
      }

      if (files.length >= env.GAME_BUNDLE_MAX_FILES) {
        await fail(row.id);
        throw new BadRequestError("too many files in bundle");
      }

      uncompressed += body.byteLength;

      if (uncompressed > env.GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES) {
        await fail(row.id);
        throw new BadRequestError("bundle expands beyond the allowed size");
      }

      const resolved = resolveContent(path);

      files.push({
        path: resolved.servedPath,
        body,
        contentType: resolved.contentType,
        contentEncoding: resolved.contentEncoding,
      });
    }

    if (!files.some((file) => file.path === row.entryPoint)) {
      await fail(row.id);
      throw new BadRequestError(`entry point ${row.entryPoint} is missing from the bundle root`);
    }

    const prefix = `${row.objectKey.replace(/\.zip$/i, "")}/files`;

    for (const file of files) {
      await storage.putObject({
        key: `${prefix}/${file.path}`,
        body: file.body,
        contentType: file.contentType,
        cacheControl: IMMUTABLE,
        ...(file.contentEncoding === null ? {} : { contentEncoding: file.contentEncoding }),
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(gameFile)
        .set({ isCurrent: false })
        .where(
          and(
            eq(gameFile.organizationId, row.organizationId),
            eq(gameFile.gameId, row.gameId),
            eq(gameFile.isCurrent, true),
          ),
        );

      await tx
        .update(gameFile)
        .set({
          status: "ready",
          servedPrefix: prefix,
          extractedAt: new Date(),
          readyAt: new Date(),
          isCurrent: true,
        })
        .where(eq(gameFile.id, row.id));
    });

    logger.info("game_bundle.extracted", {
      fileId: row.id,
      files: files.length,
      bytes: uncompressed,
    });

    return { files: files.length };
  };
}
