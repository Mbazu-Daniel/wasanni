import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameFile } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, ConflictError, InternalServerError, newId, NotFoundError, type ObjectStorage } from "@wasanni/kit";
import type {
  CreateGameBody,
  GameView,
  ListGamesQuery,
  UpdateGameBody,
} from "@wasanni/contracts";
import { hasReadyGameFile } from "./game-state.ts";
import type { GameRow } from "./types.ts";

const toView = (row: GameRow): GameView => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  slug: row.slug,
  description: row.description,
  hosting: row.hosting,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export function createGameService(db: Db, storage: ObjectStorage) {
  const rethrowAsSlugConflict = (error: unknown): never => {
    if (isUniqueViolation(error)) throw new ConflictError("game slug already exists");
    throw error;
  };

  return {
    async list(scope: Scope, filter: ListGamesQuery): Promise<GameView[]> {
      const rows = await db
        .select()
        .from(game)
        .where(
          scopeTo(
            scope,
            game,
            filter.hosting === undefined ? undefined : eq(game.hosting, filter.hosting),
            filter.status === undefined ? undefined : eq(game.status, filter.status),
          ),
        )
        .orderBy(desc(game.createdAt));

      return rows.map(toView);
    },

    async get(scope: Scope, gameId: string): Promise<GameView> {
      const [row] = await db
        .select()
        .from(game)
        .where(scopeTo(scope, game, eq(game.id, gameId)))
        .limit(1);

      if (row === undefined) throw new NotFoundError("game not found");
      return toView(row);
    },

    async create(scope: Scope, input: CreateGameBody): Promise<GameView> {
      try {
        const [row] = await db
          .insert(game)
          .values({
            id: newId(),
            organizationId: scope.organizationId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            hosting: input.hosting,
          })
          .returning();

        if (row === undefined) throw new InternalServerError("game insert returned no row");
        return toView(row);
      } catch (error) {
        return rethrowAsSlugConflict(error);
      }
    },

    async update(scope: Scope, gameId: string, patch: UpdateGameBody): Promise<GameView> {
      try {
        const [row] = await db
          .update(game)
          .set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            updatedAt: new Date(),
          })
          .where(scopeTo(scope, game, eq(game.id, gameId)))
          .returning();

        if (row === undefined) throw new NotFoundError("game not found");
        return toView(row);
      } catch (error) {
        return rethrowAsSlugConflict(error);
      }
    },

    async publish(scope: Scope, gameId: string): Promise<GameView> {
      const current = await this.get(scope, gameId);

      if (current.hosting === "hosted" && !(await hasReadyGameFile(db, scope, gameId))) {
        throw new BadRequestError("a hosted game needs a ready game file before it is published");
      }

      const [row] = await db
        .update(game)
        .set({ status: "active", updatedAt: new Date() })
        .where(scopeTo(scope, game, eq(game.id, gameId)))
        .returning();

      if (row === undefined) throw new NotFoundError("game not found");
      return toView(row);
    },

    async archive(scope: Scope, gameId: string): Promise<GameView> {
      const [row] = await db
        .update(game)
        .set({ status: "archived", updatedAt: new Date() })
        .where(scopeTo(scope, game, eq(game.id, gameId)))
        .returning();

      if (row === undefined) throw new NotFoundError("game not found");
      return toView(row);
    },

    async remove(scope: Scope, gameId: string): Promise<void> {
      const files = await db
        .select({ objectKey: gameFile.objectKey })
        .from(gameFile)
        .where(scopeTo(scope, gameFile, eq(gameFile.gameId, gameId)));

      const removed = await db
        .delete(game)
        .where(scopeTo(scope, game, eq(game.id, gameId)))
        .returning({ id: game.id });

      if (removed.length === 0) throw new NotFoundError("game not found");

      await Promise.allSettled(
        files.map((file) => storage.deleteObject(file.objectKey)),
      );
    },
  };
}
