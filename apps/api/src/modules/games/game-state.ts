import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameConfig, gameFile, gamePlatformAssignment } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import type { AssignmentConfig, AssignmentState, GameState } from "./types.ts";

export async function readGameState(
  db: Db,
  scope: Scope,
  gameId: string,
): Promise<GameState | null> {
  const [row] = await db
    .select({ id: game.id, hosting: game.hosting, status: game.status })
    .from(game)
    .where(scopeTo(scope, game, eq(game.id, gameId)))
    .limit(1);

  return row ?? null;
}

export async function hasReadyGameFile(
  db: Db,
  scope: Scope,
  gameId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: gameFile.id })
    .from(gameFile)
    .where(
      scopeTo(scope, gameFile, eq(gameFile.gameId, gameId), eq(gameFile.status, "ready")),
    )
    .limit(1);

  return row !== undefined;
}

export async function readCurrentGameFile(
  db: Db,
  scope: Scope,
  gameId: string,
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: gameFile.id })
    .from(gameFile)
    .where(
      scopeTo(
        scope,
        gameFile,
        eq(gameFile.gameId, gameId),
        eq(gameFile.isCurrent, true),
        eq(gameFile.status, "ready"),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function readAssignmentState(
  db: Db,
  scope: Scope,
  platformId: string,
  gameId: string,
): Promise<AssignmentState | null> {
  const [row] = await db
    .select({
      id: gamePlatformAssignment.id,
      status: gamePlatformAssignment.status,
    })
    .from(gamePlatformAssignment)
    .where(
      scopeTo(
        scope,
        gamePlatformAssignment,
        eq(gamePlatformAssignment.gameId, gameId),
        eq(gamePlatformAssignment.platformId, platformId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function readAssignmentConfig(
  db: Db,
  scope: Scope,
  assignmentId: string,
  configId?: string,
): Promise<AssignmentConfig | null> {
  const [row] = await db
    .select({
      id: gameConfig.id,
      config: gameConfig.config,
      schemaVersion: gameConfig.schemaVersion,
    })
    .from(gameConfig)
    .where(
      scopeTo(
        scope,
        gameConfig,
        eq(gameConfig.assignmentId, assignmentId),
        configId === undefined
          ? eq(gameConfig.isDefault, true)
          : eq(gameConfig.id, configId),
      ),
    )
    .limit(1);

  return row ?? null;
}
