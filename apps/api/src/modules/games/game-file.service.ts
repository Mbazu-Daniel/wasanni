import { desc, eq, getTableColumns } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameFile, gamePlatformAssignment, platform } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo, markFileCurrent, demoteCurrentGameFile } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  confirmPendingUpload,
  InternalServerError,
  newId,
  NotFoundError,
  type ObjectStorage,
  type StorageLimits,
} from "@wasanni/kit";
import type { GameFileKind, GameFileUpload, GameFileView } from "@wasanni/contracts";
import type { Enqueuer } from "@wasanni/jobs";
import { GAME_FILE_CONTENT_TYPES } from "./constants.ts";
import { readGameState } from "./game-state.ts";
import type { GameFileRow, GameFileUploadInput } from "./types.ts";

const isZip = (contentType: string): boolean =>
  contentType === "application/zip" || contentType === "application/x-zip-compressed";

const gameSlugOf = async (db: Db, scope: Scope, gameId: string): Promise<string> => {
  const [owner] = await db
    .select({ slug: game.slug })
    .from(game)
    .where(scopeTo(scope, game, eq(game.id, gameId)))
    .limit(1);

  if (owner === undefined) throw new NotFoundError("game not found");
  return owner.slug;
};

const nextVersion = (latest: string | undefined): string => {
  const match = /^(.+)-(\d+)$/.exec(latest ?? "");

  return match === null
    ? `${latest ?? "agent"}-1`
    : `${match[1]}-${Number(match[2]) + 1}`;
};

const toView = (row: GameFileRow & { platformSlug: string | null }): GameFileView => ({
  id: row.id,
  organizationId: row.organizationId,
  gameId: row.gameId,
  platformId: row.platformId,
  platformSlug: row.platformSlug,
  version: row.version,
  sizeBytes: row.sizeBytes,
  contentType: row.contentType,
  etag: row.etag,
  status: row.status,
  kind: row.kind,
  entryPoint: row.entryPoint,
  crossOriginIsolation: row.crossOriginIsolation,
  spaFallback: row.spaFallback,
  servedPrefix: row.servedPrefix,
  isCurrent: row.isCurrent,
  createdAt: row.createdAt.toISOString(),
  readyAt: row.readyAt === null ? null : row.readyAt.toISOString(),
  uploadExpiresAt: row.uploadExpiresAt === null ? null : row.uploadExpiresAt.toISOString(),
});

export function createGameFileService(
  db: Db,
  storage: ObjectStorage,
  config: StorageLimits,
  enqueuer: Enqueuer | null,
) {
  const resolveBuildPlatform = async (
    scope: Scope,
    gameId: string,
    platformId: string | undefined,
  ): Promise<{ id: string; slug: string }> => {
    if (platformId !== undefined) {
      const [assignment] = await db
        .select({ id: platform.id, slug: platform.slug })
        .from(gamePlatformAssignment)
        .innerJoin(platform, eq(platform.id, gamePlatformAssignment.platformId))
        .where(
          scopeTo(
            scope,
            gamePlatformAssignment,
            eq(gamePlatformAssignment.gameId, gameId),
            eq(gamePlatformAssignment.platformId, platformId),
          ),
        )
        .limit(1);

      if (assignment === undefined) {
        throw new ForbiddenError("this game is not assigned to the platform");
      }
      return assignment;
    }

    const rows = await db
      .select({ id: platform.id, slug: platform.slug })
      .from(gamePlatformAssignment)
      .innerJoin(platform, eq(platform.id, gamePlatformAssignment.platformId))
      .where(scopeTo(scope, gamePlatformAssignment, eq(gamePlatformAssignment.gameId, gameId)));

    if (rows.length === 0) {
      throw new BadRequestError("assign the game to a platform before uploading a build");
    }
    if (rows.length > 1) {
      throw new BadRequestError("this game is on several platforms, name the platform for this build");
    }
    return rows[0] as { id: string; slug: string };
  };

  const getFile = async (
    scope: Scope,
    gameId: string,
    fileId: string,
  ): Promise<GameFileRow & { platformSlug: string | null }> => {
    const [row] = await db
      .select({ ...getTableColumns(gameFile), platformSlug: platform.slug })
      .from(gameFile)
      .leftJoin(platform, eq(platform.id, gameFile.platformId))
      .where(scopeTo(scope, gameFile, eq(gameFile.id, fileId), eq(gameFile.gameId, gameId)))
      .limit(1);

    if (row === undefined) throw new NotFoundError("game file not found");
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
        .select({ ...getTableColumns(gameFile), platformSlug: platform.slug })
        .from(gameFile)
        .leftJoin(platform, eq(platform.id, gameFile.platformId))
        .where(scopeTo(scope, gameFile, eq(gameFile.gameId, gameId)))
        .orderBy(desc(gameFile.createdAt));

      return rows.map(toView);
    },

    async createUpload(
      scope: Scope,
      input: GameFileUploadInput,
    ): Promise<GameFileUpload> {
      const owner = await readGameState(db, scope, input.gameId);

      if (owner === null) throw new NotFoundError("game not found");
      if (owner.hosting !== "hosted") {
        throw new BadRequestError("an external game does not accept game files");
      }

      if (
        !GAME_FILE_CONTENT_TYPES.includes(
          input.body.contentType as (typeof GAME_FILE_CONTENT_TYPES)[number],
        )
      ) {
        throw new BadRequestError("unsupported game file content type");
      }

      if (input.body.sizeBytes < 1 || input.body.sizeBytes > config.maxBundleBytes) {
        throw new BadRequestError("the game file is outside the size this api accepts");
      }

      const kind: GameFileKind = input.body.kind ?? (isZip(input.body.contentType) ? "bundle" : "single");

      if (kind === "bundle" && !input.body.filename.toLowerCase().endsWith(".zip")) {
        throw new BadRequestError("a bundle upload must be a .zip");
      }

      if (kind === "single" && isZip(input.body.contentType)) {
        throw new BadRequestError("a .zip upload must be declared as a bundle");
      }

      const fileId = newId();
      const slug = await gameSlugOf(db, scope, input.gameId);
      const buildPlatform = await resolveBuildPlatform(scope, input.gameId, input.body.platformId);
      const stamp = Date.now();
      const ext = input.body.filename.includes(".")
        ? (input.body.filename.split(".").pop() as string).toLowerCase()
        : "html";
      const key = kind === "bundle"
        ? `${buildPlatform.slug}/${slug}/${stamp}.zip`
        : `${buildPlatform.slug}/${slug}/${stamp}.${ext}`;

      const upload = await storage.createUploadTarget({
        key,
        contentType: input.body.contentType,
        sizeBytes: input.body.sizeBytes,
        expiresInSeconds: config.uploadUrlTtlSeconds,
      });

      let row: GameFileRow | undefined;
      try {
        [row] = await db
          .insert(gameFile)
          .values({
            id: fileId,
            organizationId: scope.organizationId,
            gameId: input.gameId,
            platformId: buildPlatform.id,
            version: input.body.version,
            objectKey: upload.key,
            sizeBytes: input.body.sizeBytes,
            contentType: input.body.contentType,
            status: "pending_upload",
            kind,
            entryPoint: input.body.entryPoint ?? "index.html",
            crossOriginIsolation: input.body.crossOriginIsolation ?? false,
            spaFallback: input.body.spaFallback ?? false,
            uploadedByMemberId: input.memberId,
            uploadExpiresAt: new Date(upload.expiresAt),
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) throw new ConflictError("this build timestamp is taken, retry the upload");
        throw error;
      }

      if (row === undefined) throw new InternalServerError("game file insert returned no row");

      return { file: toView({ ...row, platformSlug: buildPlatform.slug }), upload };
    },

    async completeUpload(
      scope: Scope,
      gameId: string,
      fileId: string,
    ): Promise<GameFileView> {
      const row = await getFile(scope, gameId, fileId);

      if (row.status === "ready" || row.status === "extracting") return toView(row);
      if (row.status === "failed") {
        throw new ConflictError("this game file upload has already failed");
      }

      const { etag } = await confirmPendingUpload(
        storage,
        {
          objectKey: row.objectKey,
          sizeBytes: row.sizeBytes,
          contentType: row.contentType,
          expiresAt: row.uploadExpiresAt,
        },
        () => markFileFailed(scope, row),
      );

      if (row.kind === "bundle") {
        if (enqueuer === null) {
          throw new InternalServerError("the bundle extraction queue is not configured");
        }

        await db
          .update(gameFile)
          .set({ status: "extracting", etag })
          .where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)));

        await enqueuer.gameBundleExtract({
          organizationId: row.organizationId,
          fileId: row.id,
        });

        return toView({ ...row, status: "extracting", etag });
      }

      await db.transaction((tx) =>
        markFileCurrent(tx, {
          organizationId: scope.organizationId,
          gameId: row.gameId,
          fileId: row.id,
          platformId: row.platformId,
          promote: { status: "ready", etag, readyAt: new Date() },
        }),
      );

      const [updated] = await db
        .select()
        .from(gameFile)
        .where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)))
        .limit(1);

      if (updated === undefined) throw new NotFoundError("game file not found");
      return toView({ ...updated, platformSlug: row.platformSlug });
    },

    async putPublishedBundle(
      scope: Scope,
      gameId: string,
      input: { memberId: string; html: string; platformId?: string },
    ): Promise<{ file: GameFileView; url: string }> {
      const owner = await readGameState(db, scope, gameId);

      if (owner === null) throw new NotFoundError("game not found");
      if (owner.hosting !== "hosted") {
        throw new BadRequestError("an external game does not accept game files");
      }

      const body = new TextEncoder().encode(input.html);

      if (body.byteLength < 1 || body.byteLength > config.maxBundleBytes) {
        throw new BadRequestError("the game file is outside the size this api accepts");
      }

      const [latest] = await db
        .select({ version: gameFile.version })
        .from(gameFile)
        .where(scopeTo(scope, gameFile, eq(gameFile.gameId, gameId)))
        .orderBy(desc(gameFile.createdAt))
        .limit(1);

      const fileId = newId();
      const slug = await gameSlugOf(db, scope, gameId);
      const buildPlatform = await resolveBuildPlatform(scope, gameId, input.platformId);
      const stored = await storage.putObject({
        key: `${buildPlatform.slug}/${slug}/${Date.now()}.html`,
        body,
        contentType: "text/html",
      });

      try {
        await db.transaction(async (tx) => {
          await demoteCurrentGameFile(tx, scope.organizationId, gameId, buildPlatform.id);

          await tx.insert(gameFile).values({
            id: fileId,
            organizationId: scope.organizationId,
            gameId,
            platformId: buildPlatform.id,
            version: nextVersion(latest?.version),
            objectKey: stored.key,
            sizeBytes: stored.sizeBytes,
            contentType: "text/html",
            etag: stored.etag,
            status: "ready",
            kind: "single",
            entryPoint: "index.html",
            isCurrent: true,
            readyAt: new Date(),
            uploadedByMemberId: input.memberId,
          });
        });
      } catch (error) {
        await storage.deleteObject(stored.key).catch(() => undefined);
        if (isUniqueViolation(error)) throw new ConflictError("this build timestamp is taken, retry the deploy");
        throw error;
      }

      const [row] = await db
        .select()
        .from(gameFile)
        .where(scopeTo(scope, gameFile, eq(gameFile.id, fileId)))
        .limit(1);

      if (row === undefined) throw new InternalServerError("game file insert returned no row");
      return { file: toView({ ...row, platformSlug: buildPlatform.slug }), url: storage.publicUrl(stored.key) };
    },

    async createDownloadUrl(
      scope: Scope,
      gameId: string,
      fileId: string,
    ): Promise<string> {
      const row = await getFile(scope, gameId, fileId);
      if (row.status !== "ready") throw new BadRequestError("this game file is not ready");

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
        throw new ConflictError("the current file of an active hosted game cannot be deleted");
      }

      await db.delete(gameFile).where(scopeTo(scope, gameFile, eq(gameFile.id, row.id)));
      await storage.deleteObject(row.objectKey).catch(() => undefined);
    },
  };
}
