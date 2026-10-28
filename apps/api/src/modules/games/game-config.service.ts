import { asc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameConfig, gamePlatformAssignment } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { ConflictError, InternalServerError, newId, NotFoundError } from "@wasanni/kit";
import type { GameConfigView } from "@wasanni/contracts";
import type { GameConfigCreateInput, GameConfigRow, GameConfigUpdateInput } from "./types.ts";

const toView = (row: GameConfigRow): GameConfigView => ({
  id: row.id,
  organizationId: row.organizationId,
  assignmentId: row.assignmentId,
  name: row.name,
  config: row.config,
  schemaVersion: row.schemaVersion,
  revision: row.revision,
  isDefault: row.isDefault,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export function createGameConfigService(
  db: Db,
  onConfigChanged?: (input: {
    organizationId: string;
    configId: string;
  }) => Promise<void>,
) {
  const assertAssignment = async (
    scope: Scope,
    gameId: string,
    assignmentId: string,
  ): Promise<void> => {
    const [row] = await db
      .select({ id: gamePlatformAssignment.id })
      .from(gamePlatformAssignment)
      .where(
        scopeTo(
          scope,
          gamePlatformAssignment,
          eq(gamePlatformAssignment.id, assignmentId),
          eq(gamePlatformAssignment.gameId, gameId),
        ),
      )
      .limit(1);

    if (row === undefined) throw new NotFoundError("assignment not found");
  };

  const getConfig = async (
    scope: Scope,
    assignmentId: string,
    configId: string,
    reader: { select: Db["select"] } = db,
  ): Promise<GameConfigRow> => {
    const [row] = await reader
      .select()
      .from(gameConfig)
      .where(
        scopeTo(
          scope,
          gameConfig,
          eq(gameConfig.id, configId),
          eq(gameConfig.assignmentId, assignmentId),
        ),
      )
      .limit(1);

    if (row === undefined) throw new NotFoundError("game config not found");
    return row;
  };

  return {
    async list(
      scope: Scope,
      gameId: string,
      assignmentId: string,
    ): Promise<GameConfigView[]> {
      await assertAssignment(scope, gameId, assignmentId);

      const rows = await db
        .select()
        .from(gameConfig)
        .where(scopeTo(scope, gameConfig, eq(gameConfig.assignmentId, assignmentId)))
        .orderBy(asc(gameConfig.name));

      return rows.map(toView);
    },

    async create(scope: Scope, input: GameConfigCreateInput): Promise<GameConfigView> {
      await assertAssignment(scope, input.gameId, input.assignmentId);

      try {
        return await db.transaction(async (tx) => {
          if (input.body.isDefault === true) {
            await tx
              .update(gameConfig)
              .set({ isDefault: false })
              .where(
                scopeTo(
                  scope,
                  gameConfig,
                  eq(gameConfig.assignmentId, input.assignmentId),
                ),
              );
          }

          const [row] = await tx
            .insert(gameConfig)
            .values({
              id: newId(),
              organizationId: scope.organizationId,
              assignmentId: input.assignmentId,
              name: input.body.name,
              config: input.body.config ?? {},
              schemaVersion: input.body.schemaVersion ?? 1,
              isDefault: input.body.isDefault ?? false,
            })
            .returning();

          if (row === undefined) throw new InternalServerError("game config insert returned no row");
          return toView(row);
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictError("this assignment already has a config with that name");
        }
        throw error;
      }
    },

    async update(scope: Scope, input: GameConfigUpdateInput): Promise<GameConfigView> {
      await assertAssignment(scope, input.gameId, input.assignmentId);

      const updated = await db.transaction(async (tx) => {
        const current = await getConfig(scope, input.assignmentId, input.configId, tx);

        if (input.body.isDefault === true) {
          await tx
            .update(gameConfig)
            .set({ isDefault: false })
            .where(
              scopeTo(scope, gameConfig, eq(gameConfig.assignmentId, input.assignmentId)),
            );
        }

        const [row] = await tx
          .update(gameConfig)
          .set({
            ...(input.body.name !== undefined ? { name: input.body.name } : {}),
            ...(input.body.config !== undefined ? { config: input.body.config } : {}),
            ...(input.body.schemaVersion !== undefined
              ? { schemaVersion: input.body.schemaVersion }
              : {}),
            ...(input.body.isDefault !== undefined
              ? { isDefault: input.body.isDefault }
              : {}),
            revision: current.revision + 1,
            updatedAt: new Date(),
          })
          .where(
            scopeTo(
              scope,
              gameConfig,
              eq(gameConfig.id, current.id),
              eq(gameConfig.revision, current.revision),
            ),
          )
          .returning();

        if (row === undefined) {
          throw new ConflictError("this game config was changed by someone else");
        }
        return toView(row);
      });

      await onConfigChanged?.({
        organizationId: scope.organizationId,
        configId: updated.id,
      }).catch(() => undefined);

      return updated;
    },

    async remove(
      scope: Scope,
      gameId: string,
      assignmentId: string,
      configId: string,
    ): Promise<void> {
      await assertAssignment(scope, gameId, assignmentId);
      const row = await getConfig(scope, assignmentId, configId);

      await db.delete(gameConfig).where(scopeTo(scope, gameConfig, eq(gameConfig.id, row.id)));
    },
  };
}
