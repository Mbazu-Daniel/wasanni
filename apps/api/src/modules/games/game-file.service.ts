import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameFile } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  badRequest,
  buildObjectKey,
  conflict,
  newId,
  notFound,
  type ObjectStorage,
  type StorageLimits,
} from "@wasanni/kit";
import type { GameFileUpload, GameFileView } from "@wasanni/contracts";
import { GAME_FILE_CONTENT_TYPES } from "./constants.ts";
import { readGameState } from "./game-state.ts";
import type { GameFileUploadInput } from "./types.ts";

type GameFileRow = (typeof gameFile.$inferSelect);

const toView = (row: GameFileRow): GameFileView => ({
  id: row.id,
  organizationId: row.organizationId,
  gameId: row.gameId,
  version: row.version,
  sizeBytes: row.sizeBytes,
  contentType: row.contentType,
  etag: row.etag,
  status: row.status,
  isCurrent: row.isCurrent,
  createdAt: row.createdAt.toISOString(),
  readyAt: row.readyAt === null ? null : row.readyAt.toISOString(),
  uploadExpiresAt: row.uploadExpiresAt === null ? null : row.uploadExpiresAt.toISOString(),
});

export function createGameFileService(
  db: Db,
  storage: ObjectStorage,
  config: StorageLimits,
) {
  const getFile = async (
    scope: Scope,
    gameId: string,
    fileId: string,
  ): Promise<GameFileRow> => {
    const [row] = await db
      .select()
      .from(gameFile)
      .where(scopeTo(scope, gameFile, eq(gameFile.id, fileId), eq(gameFile.gameId, gameId)))
      .limit(1);

    if (row === undefined) throw notFound("game file not found");
    return row;
  };

  const markFileFailed = async (scope: Scope, row: GameFileRow): Promise<void> => {
    await storage.deleteObject(row.objectKey).catch(() => undefined);
    await db
      .update(gameFile)
      .set({ status: "failed" })
      .where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)));
  };

  return {
    async list(scope: Scope, gameId: string): Promise<GameFileView[]> {
      const rows = await db
        .select()
        .from(gameFile)
        .where(scopeTo(scope, gameFile, eq(gameFile.gameId, gameId)))
        .orderBy(desc(gameFile.createdAt));

      return rows.map(toView);
    },

    async createUpload(
      scope: Scope,
      input: GameFileUploadInput,
    ): Promise<GameFileUpload> {
      const owner = await readGameState(db, scope, input.gameId);

      if (owner === null) throw notFound("game not found");
      if (owner.hosting !== "hosted") {
        throw badRequest("an external game does not accept game files");
      }

      if (
        !GAME_FILE_CONTENT_TYPES.includes(
          input.body.contentType as (typeof GAME_FILE_CONTENT_TYPES)[number],
        )
      ) {
        throw badRequest("unsupported game file content type");
      }

      if (input.body.sizeBytes < 1 || input.body.sizeBytes > config.maxBundleBytes) {
        throw badRequest("the game file is outside the size this api accepts");
      }

      const fileId = newId();

      const upload = await storage.createUploadTarget({
        key: buildObjectKey({
          location: "game-bundles",
          organizationId: scope.organizationId,
          segments: [input.gameId, fileId],
          filename: input.body.filename,
        }),
        contentType: input.body.contentType,
        sizeBytes: input.body.sizeBytes,
        expiresInSeconds: config.uploadUrlTtlSeconds,
      });

      const [row] = await db
        .insert(gameFile)
        .values({
          id: fileId,
          organizationId: scope.organizationId,
          gameId: input.gameId,
          version: input.body.version,
          objectKey: upload.key,
          sizeBytes: input.body.sizeBytes,
          contentType: input.body.contentType,
          status: "pending_upload",
          uploadedByMemberId: input.memberId,
          uploadExpiresAt: new Date(upload.expiresAt),
        })
        .returning();

      if (row === undefined) throw new Error("game file insert returned no row");

      return { file: toView(row), upload };
    },

    async completeUpload(
      scope: Scope,
      gameId: string,
      fileId: string,
    ): Promise<GameFileView> {
      const row = await getFile(scope, gameId, fileId);

      if (row.status === "ready") return toView(row);
      if (row.status === "failed") {
        throw conflict("this game file upload has already failed");
      }

      if (row.uploadExpiresAt !== null && row.uploadExpiresAt.getTime() < Date.now()) {
        await markFileFailed(scope, row);
        throw badRequest("the upload url has expired");
      }

      const object = await storage.headObject(row.objectKey);
      if (object === null) throw badRequest("the uploaded object was not found");

      if (object.sizeBytes !== row.sizeBytes) {
        await markFileFailed(scope, row);
        throw badRequest("the uploaded object does not have the declared size");
      }

      if (object.contentType !== row.contentType) {
        await markFileFailed(scope, row);
        throw badRequest("the uploaded object does not have the declared content type");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(gameFile)
          .set({ isCurrent: false })
          .where(
            scopeTo(
              scope,
              gameFile,
              eq(gameFile.gameId, row.gameId),
              eq(gameFile.isCurrent, true),
            ),
          );

        await tx
          .update(gameFile)
          .set({
            status: "ready",
            etag: object.etag,
            isCurrent: true,
            readyAt: new Date(),
          })
          .where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)));
      });

      const [updated] = await db
        .select()
        .from(gameFile)
        .where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)))
        .limit(1);

      if (updated === undefined) throw notFound("game file not found");
      return toView(updated);
    },

    async createDownloadUrl(
      scope: Scope,
      gameId: string,
      fileId: string,
    ): Promise<string> {
      const row = await getFile(scope, gameId, fileId);
      if (row.status !== "ready") throw badRequest("this game file is not ready");

      return storage.createDownloadUrl({
        key: row.objectKey,
        expiresInSeconds: config.downloadUrlTtlSeconds,
      });
    },

    async remove(scope: Scope, gameId: string, fileId: string): Promise<void> {
      const row = await getFile(scope, gameId, fileId);

      const owner = await readGameState(db, scope, gameId);

      if (
        row.isCurrent &&
        owner?.status === "active" &&
        owner.hosting === "hosted"
      ) {
        throw conflict("the current file of an active hosted game cannot be deleted");
      }

      await db.delete(gameFile).where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)));
      await storage.deleteObject(row.objectKey).catch(() => undefined);
    },
  };
}

export type GameFileService = ReturnType<typeof createGameFileService>;
