import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gamePlatformAssignment, platform } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { ConflictError, InternalServerError, newId, NotFoundError } from "@wasanni/kit";
import type { AssignmentView, OrgAssignmentView } from "@wasanni/contracts";
import type { AssignmentCreateInput, AssignmentRow } from "./types.ts";

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

    async listForOrganization(organizationId: string): Promise<OrgAssignmentView[]> {
      const rows = await db
        .select({
          id: gamePlatformAssignment.id,
          organizationId: gamePlatformAssignment.organizationId,
          gameId: gamePlatformAssignment.gameId,
          platformId: gamePlatformAssignment.platformId,
          status: gamePlatformAssignment.status,
          createdAt: gamePlatformAssignment.createdAt,
          updatedAt: gamePlatformAssignment.updatedAt,
          gameName: game.name,
          gameSlug: game.slug,
          gameHosting: game.hosting,
          gameStatus: game.status,
          platformName: platform.name,
          platformSlug: platform.slug,
        })
        .from(gamePlatformAssignment)
        .innerJoin(game, eq(gamePlatformAssignment.gameId, game.id))
        .innerJoin(platform, eq(gamePlatformAssignment.platformId, platform.id))
        .where(eq(gamePlatformAssignment.organizationId, organizationId))
        .orderBy(desc(gamePlatformAssignment.createdAt));

      return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    },

    async create(scope: Scope, input: AssignmentCreateInput): Promise<AssignmentView> {
      const [ownedGame] = await db
        .select({ id: game.id })
        .from(game)
        .where(scopeTo(scope, game, eq(game.id, input.gameId)))
        .limit(1);

      if (ownedGame === undefined) throw new NotFoundError("game not found");

      const [ownedPlatform] = await db
        .select({ id: platform.id })
        .from(platform)
        .where(scopeTo(scope, platform, eq(platform.id, input.platformId)))
        .limit(1);

      if (ownedPlatform === undefined) throw new NotFoundError("platform not found");

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
          throw new InternalServerError("game platform assignment insert returned no row");
        }

        return toView(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError("this game is already assigned to that platform");
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

      if (removed.length === 0) throw new NotFoundError("assignment not found");
    },
  };
}
