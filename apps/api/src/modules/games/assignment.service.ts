import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gamePlatformAssignment, platform } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { conflict, newId, notFound } from "@wasanni/kit";
import type { AssignmentView } from "@wasanni/contracts";
import type { AssignmentCreateInput } from "./types.ts";

type AssignmentRow = (typeof gamePlatformAssignment.$inferSelect);

const toView = (row: AssignmentRow): AssignmentView => ({
  id: row.id,
  organizationId: row.organizationId,
  gameId: row.gameId,
  platformId: row.platformId,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export function createAssignmentService(db: Db) {
  return {
    async listByGame(scope: Scope, gameId: string): Promise<AssignmentView[]> {
      const rows = await db
        .select()
        .from(gamePlatformAssignment)
        .where(
          scopeTo(scope, gamePlatformAssignment, eq(gamePlatformAssignment.gameId, gameId)),
        )
        .orderBy(desc(gamePlatformAssignment.createdAt));

      return rows.map(toView);
    },

    async listGamesByPlatform(
      scope: Scope,
      platformId: string,
    ): Promise<AssignmentView[]> {
      const rows = await db
        .select()
        .from(gamePlatformAssignment)
        .where(
          scopeTo(
            scope,
            gamePlatformAssignment,
            eq(gamePlatformAssignment.platformId, platformId),
          ),
        )
        .orderBy(desc(gamePlatformAssignment.createdAt));

      return rows.map(toView);
    },

    async create(scope: Scope, input: AssignmentCreateInput): Promise<AssignmentView> {
      const [ownedGame] = await db
        .select({ id: game.id })
        .from(game)
        .where(scopeTo(scope, game, eq(game.id, input.gameId)))
        .limit(1);

      if (ownedGame === undefined) throw notFound("game not found");

      const [ownedPlatform] = await db
        .select({ id: platform.id })
        .from(platform)
        .where(scopeTo(scope, platform, eq(platform.id, input.platformId)))
        .limit(1);

      if (ownedPlatform === undefined) throw notFound("platform not found");

      try {
        const [row] = await db
          .insert(gamePlatformAssignment)
          .values({
            id: newId(),
            organizationId: scope.organizationId,
            gameId: input.gameId,
            platformId: input.platformId,
            status: "active",
            assignedByMemberId: input.memberId,
          })
          .returning();

        if (row === undefined) {
          throw new Error("game platform assignment insert returned no row");
        }

        return toView(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict("this game is already assigned to that platform");
        }
        throw error;
      }
    },

    async remove(
      scope: Scope,
      gameId: string,
      assignmentId: string,
    ): Promise<void> {
      const removed = await db
        .delete(gamePlatformAssignment)
        .where(
          scopeTo(
            scope,
            gamePlatformAssignment,
            eq(gamePlatformAssignment.id, assignmentId),
            eq(gamePlatformAssignment.gameId, gameId),
          ),
        )
        .returning({ id: gamePlatformAssignment.id });

      if (removed.length === 0) throw notFound("assignment not found");
    },
  };
}

export type AssignmentService = ReturnType<typeof createAssignmentService>;
