import { eq, and } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import {
  gameSession,
  match,
  matchParticipant,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, InternalServerError, newId, newOpaqueToken, NotFoundError, sha256Hex } from "@wasanni/kit";
import type {
  CreatedGameSession,
  GameSessionView,
  ScoreVerificationMode,
} from "@wasanni/contracts";
import { REALTIME_PATH } from "@wasanni/contracts";
import {
  readAssignmentConfig,
  readAssignmentState,
  readCurrentGameFile,
  readGameState,
} from "../games/game-state.ts";
import {
  DEFAULT_SESSION_DURATION_SECONDS,
  MAX_SESSION_DURATION_SECONDS,
  MIN_SESSION_DURATION_SECONDS,
} from "./constants.ts";
import type { GameSessionRow, SessionCreateInput, SessionServiceDeps } from "./types.ts";

const toView = (row: GameSessionRow): GameSessionView => ({
  id: row.id,
  organizationId: row.organizationId,
  platformId: row.platformId,
  gameId: row.gameId,
  assignmentId: row.assignmentId,
  gameFileId: row.gameFileId,
  gameConfigId: row.gameConfigId,
  tournamentId: row.tournamentId,
  matchId: row.matchId,
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

const readVerificationMode = (config: Record<string, unknown>): ScoreVerificationMode => {
  const block = config.scoreVerification;

  if (typeof block !== "object" || block === null) return "none";

  const mode = (block as Record<string, unknown>).mode;

  if (mode === "hmac" || mode === "callback" || mode === "both") return mode;

  return "none";
};

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

  if (row === undefined) throw new NotFoundError("game session not found");
  return row;
}

async function assertCompetitionEntry(
  db: Db,
  scope: Scope,
  input: {
    platformId: string;
    gameId: string;
    externalUserId: string;
    tournamentId: string | null;
    matchId: string | null;
  },
): Promise<void> {
  if (input.tournamentId !== null) {
    const [current] = await db
      .select()
      .from(tournament)
      .where(scopeTo(scope, tournament, eq(tournament.id, input.tournamentId)))
      .limit(1);

    if (current === undefined) throw new NotFoundError("tournament not found");
    if (current.gameId !== input.gameId) {
      throw new BadRequestError("the tournament belongs to another game");
    }
    if (current.status !== "open" && current.status !== "running") {
      throw new BadRequestError("the tournament is not accepting sessions");
    }

    const [registration] = await db
      .select({ status: tournamentParticipant.status })
      .from(tournamentParticipant)
      .where(
        and(
          eq(tournamentParticipant.tournamentId, input.tournamentId),
          eq(tournamentParticipant.platformId, input.platformId),
          eq(tournamentParticipant.externalUserId, input.externalUserId),
        ),
      )
      .limit(1);

    if (registration === undefined) {
      throw new BadRequestError("the player is not registered for this tournament");
    }
    if (registration.status === "withdrawn") {
      throw new BadRequestError("the player has withdrawn from this tournament");
    }
  }

  if (input.matchId !== null) {
    const [current] = await db
      .select()
      .from(match)
      .where(scopeTo(scope, match, eq(match.id, input.matchId)))
      .limit(1);

    if (current === undefined) throw new NotFoundError("match not found");
    if (current.gameId !== input.gameId) {
      throw new BadRequestError("the match belongs to another game");
    }
    if (current.status === "completed" || current.status === "cancelled") {
      throw new BadRequestError("the match is closed");
    }

    const [seated] = await db
      .select({ id: matchParticipant.id })
      .from(matchParticipant)
      .where(
        and(
          eq(matchParticipant.matchId, input.matchId),
          eq(matchParticipant.platformId, input.platformId),
          eq(matchParticipant.externalUserId, input.externalUserId),
        ),
      )
      .limit(1);

    if (seated === undefined) {
      throw new BadRequestError("the player is not seated in this match");
    }
  }
}

export function createSessionService(db: Db, deps: SessionServiceDeps) {  const endSession = async (
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

      if (assignment === null) throw new NotFoundError("the game is not assigned to this platform");
      if (assignment.status !== "active") {
        throw new BadRequestError("the game is not assigned to this platform");
      }

      const game = await readGameState(db, scope, input.body.gameId);
      if (game === null) throw new NotFoundError("game not found");
      if (game.status !== "active") throw new BadRequestError("the game is not published");

      const resolved = await readAssignmentConfig(
        db,
        scope,
        assignment.id,
        input.body.configId,
      );

      if (input.body.configId !== undefined && resolved === null) {
        throw new NotFoundError("game config not found");
      }

      const config = resolved ?? { id: null, config: {}, schemaVersion: 1 };

      let gameFileId: string | null = null;

      if (game.hosting === "hosted") {
        const file = await readCurrentGameFile(db, scope, input.body.gameId);
        if (file === null) throw new BadRequestError("a hosted game needs a ready game file");
        gameFileId = file.id;
      }

      const mode = deps.verifier === null ? "none" : readVerificationMode(config.config);

      let signingKeyCiphertext: string | null = null;
      let signingKeyPlaintext: string | null = null;

      if (mode === "hmac" || mode === "both") {
        const key = deps.verifier!.createSigningKey();

        signingKeyCiphertext = key.ciphertext;
        signingKeyPlaintext = key.plaintext;
      }

      if (deps.usage !== null) {
        await deps.usage.checkQuota({
          organizationId: scope.organizationId,
          metric: "sessions_created",
        });
      }

      const durationSeconds = readSessionDuration(config.config);
      const expiresAt = new Date(Date.now() + durationSeconds * 1000);
      const sessionToken = newOpaqueToken(32);
      const tournamentId = input.body.tournamentId ?? null;
      const matchId = input.body.matchId ?? null;

      await assertCompetitionEntry(db, scope, {
        platformId: input.platformId,
        gameId: input.body.gameId,
        externalUserId: input.body.externalUserId,
        tournamentId,
        matchId,
      });

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
          tournamentId,
          matchId,
          externalUserId: input.body.externalUserId,
          externalUserName: input.body.externalUserName ?? null,
          mode: input.body.mode ?? null,
          status: "active",
          tokenHash: sha256Hex(sessionToken),
          scoreVerificationMode: mode,
          scoreSigningKeyCiphertext: signingKeyCiphertext,
          configSnapshot: config.config,
          configSchemaVersion: config.schemaVersion,
          metadata: input.body.metadata ?? {},
          expiresAt,
        })
        .returning();

      if (row === undefined) throw new InternalServerError("game session insert returned no row");

      if (deps.usage !== null) {
        await deps.usage.incr({
          organizationId: scope.organizationId,
          platformId: input.platformId,
          metric: "sessions_created",
        });
      }

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

      return {
        session,
        sessionToken,
        realtimeUrl,
        ...(signingKeyPlaintext === null ? {} : { scoreSigningKey: signingKeyPlaintext }),
      };
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
