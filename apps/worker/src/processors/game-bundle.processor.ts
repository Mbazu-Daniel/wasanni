import { and, eq } from "drizzle-orm";
import { Unzip, UnzipInflate } from "fflate";
import { markFileCurrent, type Db } from "@wasanni/db";
import { gameFile } from "@wasanni/db/schema";
import { BadRequestError, resolveContent, type Env, type Logger, type ObjectStorage } from "@wasanni/kit";
import type { GameBundleJob } from "@wasanni/jobs";

const IMMUTABLE = "public, max-age=31536000, immutable";
const CHUNK_BYTES = 65_536;

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

type ExtractedEntry = { path: string; body: Uint8Array };

const joinChunks = (chunks: Uint8Array[]): Uint8Array => {
  const body = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));

  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
};

const extractZip = (zip: Uint8Array, env: Env): Promise<ExtractedEntry[]> =>
  new Promise((resolve, reject) => {
    const entries: ExtractedEntry[] = [];

    let expanded = 0;
    let failed = false;

    const rejectOnce = (error: unknown): void => {
      if (failed) return;

      failed = true;
      reject(error);
    };

    const unzipper = new Unzip((file) => {
      if (failed) return;
      if (file.name.endsWith("/")) return;

      if (normalizePath(file.name) === null) {
        rejectOnce(new BadRequestError("unsafe path in bundle"));
        return;
      }

      if (entries.length >= env.GAME_BUNDLE_MAX_FILES) {
        rejectOnce(new BadRequestError("too many files in bundle"));
        return;
      }

      const path = file.name;
      const chunks: Uint8Array[] = [];

      file.ondata = (error, data, final) => {
        if (failed) return;

        if (error !== null) {
          rejectOnce(error);
          return;
        }

        expanded += data.byteLength;

        if (expanded > env.GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES) {
          file.terminate();
          rejectOnce(new BadRequestError("bundle expands beyond the allowed size"));
          return;
        }

        chunks.push(data);

        if (final) entries.push({ path, body: joinChunks(chunks) });
      };

      file.start();
    });

    unzipper.register(UnzipInflate);

    try {
      for (let offset = 0; offset < zip.byteLength; offset += CHUNK_BYTES) {
        const end = Math.min(offset + CHUNK_BYTES, zip.byteLength);

        unzipper.push(zip.subarray(offset, end), end >= zip.byteLength);
        if (failed) break;
      }
    } catch (error) {
      rejectOnce(error);
      return;
    }

    if (!failed) resolve(entries);
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

    const extracted = await extractZip(zip, env).catch(async (error: unknown) => {
      await fail(row.id);
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError("the bundle is not a readable zip", { cause: error });
    });

    const files: {
      path: string;
      body: Uint8Array;
      contentType: string;
      contentEncoding: string | null;
    }[] = [];

    let uncompressed = 0;

    for (const entry of extracted) {
      const resolved = resolveContent(entry.path);

      uncompressed += entry.body.byteLength;

      files.push({
        path: resolved.servedPath,
        body: entry.body,
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

    await db.transaction((tx) =>
      markFileCurrent(tx, {
        organizationId: row.organizationId,
        gameId: row.gameId,
        fileId: row.id,
        platformId: row.platformId,
        promote: {
          status: "ready",
          servedPrefix: prefix,
          extractedAt: new Date(),
          readyAt: new Date(),
        },
      }),
    );

    logger.info("game_bundle.extracted", {
      fileId: row.id,
      files: files.length,
      bytes: uncompressed,
    });

    return { files: files.length };
  };
}
