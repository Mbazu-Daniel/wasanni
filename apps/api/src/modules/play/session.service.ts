import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSession } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { badRequest, newId, newOpaqueToken, notFound, sha256Hex } from "@wasanni/kit";
import type { CreatedGameSession, GameSessionView } from "@wasanni/contracts";
import { REALTIME_PATH } from "@wasanni/contracts";
import type { Enqueuer } from "@wasanni/jobs";
import {
  readAssignmentConfig,
  readAssignmentState,
  readCurrentGameFile,
  readGameState,
} from "../games/game-state.ts";
import type { WebhookDispatcher } from "../webhook/webhook-dispatcher.ts";
import {
  DEFAULT_SESSION_DURATION_SECONDS,
  MAX_SESSION_DURATION_SECONDS,
  MIN_SESSION_DURATION_SECONDS,
} from "./constants.ts";
import type { GameSessionRow, SessionCreateInput } from "./types.ts";

export type SessionDeps = {
  dispatcher: WebhookDispatcher;
  enqueuer: Enqueuer | null;
  realtimeBaseUrl: string;
};

const toView = (row: GameSessionRow): GameSessionView => ({
  id: row.id,
  organizationId: row.organizationId,
  platformId: row.platformId,
  gameId: row.gameId,
  assignmentId: row.assignmentId,
  gameFileId: row.gameFileId,
  gameConfigId: row.gameConfigId,
  externalUserId: row.externalUserId,
  externalUserName: row.externalUserName,
  mode: row.mode,
  status: row.status,
  config: row.configSnapshot,
  configSchemaVersion: row.configSchemaVersion,
  startedAt: row.startedAt.toISOString(),
  expiresAt: row.expiresAt.toISOString(),
  endedAt: row.endedAt === null ? null : row.endedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
});

const readSessionDuration = (config: Record<string, unknown>): number => {
  const value = config.sessionDurationSeconds;

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_SESSION_DURATION_SECONDS;
  }

  if (value < MIN_SESSION_DURATION_SECONDS || value > MAX_SESSION_DURATION_SECONDS) {
    return DEFAULT_SESSION_DURATION_SECONDS;
  }

  return value;
};

export async function readGameSessionRow(
  db: Db,
  scope: Scope,
  platformId: string,
  sessionId: string,
): Promise<GameSessionRow> {
  const [row] = await db
    .select()
    .from(gameSession)
    .where(
      scopeTo(
        scope,
        gameSession,
        eq(gameSession.id, sessionId),
        eq(gameSession.platformId, platformId),
      ),
    )
    .limit(1);

  if (row === undefined) throw notFound("game session not found");
  return row;
}

export function createSessionService(db: Db, deps: SessionDeps) {
  const endSession = async (
    scope: Scope,
    session: GameSessionRow,
    at: Date,
  ): Promise<void> => {
    if (session.status === "ended") return;

    await db
      .update(gameSession)
      .set({ status: "ended", endedAt: at })
      .where(scopeTo(scope, gameSession, eq(gameSession.id, session.id)));

    await deps.dispatcher
      .dispatch({
        organizationId: session.organizationId,
        platformId: session.platformId,
        eventType: "session.ended",
        payload: { sessionId: session.id, gameId: session.gameId },
      })
      .catch(() => 0);

    await deps.enqueuer?.scorePackNow(session.organizationId).catch(() => undefined);
  };

  return {
    async create(
      scope: Scope,
      input: SessionCreateInput,
    ): Promise<CreatedGameSession> {
      const assignment = await readAssignmentState(
        db,
        scope,
        input.platformId,
        input.body.gameId,
      );

      if (assignment === null) throw notFound("the game is not assigned to this platform");
      if (assignment.status !== "active") {
        throw badRequest("the game is not assigned to this platform");
      }

      const game = await readGameState(db, scope, input.body.gameId);
      if (game === null) throw notFound("game not found");
      if (game.status !== "active") throw badRequest("the game is not published");

      const resolved = await readAssignmentConfig(
        db,
        scope,
        assignment.id,
        input.body.configId,
      );

      if (input.body.configId !== undefined && resolved === null) {
        throw notFound("game config not found");
      }

      const config = resolved ?? { id: null, config: {}, schemaVersion: 1 };

      let gameFileId: string | null = null;

      if (game.hosting === "hosted") {
        const file = await readCurrentGameFile(db, scope, input.body.gameId);
        if (file === null) throw badRequest("a hosted game needs a ready game file");
        gameFileId = file.id;
      }

      const durationSeconds = readSessionDuration(config.config);
      const expiresAt = new Date(Date.now() + durationSeconds * 1000);
      const sessionToken = newOpaqueToken(32);

      const [row] = await db
        .insert(gameSession)
        .values({
          id: newId(),
          organizationId: scope.organizationId,
          platformId: input.platformId,
          gameId: input.body.gameId,
          assignmentId: assignment.id,
          gameFileId,
          gameConfigId: config.id,
          externalUserId: input.body.externalUserId,
          externalUserName: input.body.externalUserName ?? null,
          mode: input.body.mode ?? null,
          status: "active",
          tokenHash: sha256Hex(sessionToken),
          configSnapshot: config.config,
          configSchemaVersion: config.schemaVersion,
          metadata: input.body.metadata ?? {},
          expiresAt,
        })
        .returning();

      if (row === undefined) throw new Error("game session insert returned no row");

      const session = toView(row);

      await deps.dispatcher
        .dispatch({
          organizationId: session.organizationId,
          platformId: session.platformId,
          eventType: "session.created",
          payload: session,
        })
        .catch(() => 0);

      const realtimeBase = deps.realtimeBaseUrl.replace(/\/+$/, "");
      const realtimeUrl = `${realtimeBase}${REALTIME_PATH}/${row.id}?token=${encodeURIComponent(sessionToken)}`;

      return { session, sessionToken, realtimeUrl };
    },

    async get(scope: Scope, platformId: string, sessionId: string): Promise<GameSessionView> {
      return toView(await readGameSessionRow(db, scope, platformId, sessionId));
    },

    async end(scope: Scope, platformId: string, sessionId: string): Promise<GameSessionView> {
      const current = await readGameSessionRow(db, scope, platformId, sessionId);

      if (current.status === "ended") return toView(current);

      await endSession(scope, current, new Date());

      return toView(await readGameSessionRow(db, scope, platformId, sessionId));
    },

    endSession,
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
