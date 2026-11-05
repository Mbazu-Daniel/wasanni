import { randomInt } from "node:crypto";
import { eq, and } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import {
  game as gameTable,
  gameFile,
  gameSession,
  joinCode,
  match,
  matchParticipant,
  platform,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  BadRequestError,
  InternalServerError,
  newId,
  newOpaqueToken,
  NotFoundError,
  readGameConfig,
  withoutCallbackSecret,
  sha256Hex,
} from "@wasanni/kit";
import type {
  CreatedGameSession,
  GameSessionView,
} from "@wasanni/contracts";
import { REALTIME_PATH } from "@wasanni/contracts";
import {
  readAssignmentConfig,
  readAssignmentState,
  readCurrentGameFile,
  readGameState,
} from "../games/game-state.ts";
import type { GameSessionRow, SessionCreateInput, SessionServiceDeps } from "./types.ts";
import { gamePlayUrl, type PlayUrlFile } from "./play-url.ts";

const JOIN_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

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
  externalName: row.externalName,
  mode: row.mode,
  status: row.status,
  config: withoutCallbackSecret(row.configSnapshot),
  configSchemaVersion: row.configSchemaVersion,
  startedAt: row.startedAt.toISOString(),
  expiresAt: row.expiresAt.toISOString(),
  endedAt: row.endedAt === null ? null : row.endedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
});

export async function readGameSessionRow(
  db: Db,
  scope: Scope,
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

    await db.transaction(async (tx) => {
      await tx
        .update(gameSession)
        .set({ status: "ended", endedAt: at })
        .where(scopeTo(scope, gameSession, eq(gameSession.id, session.id)));

      await deps.dispatcher.dispatch(
        {
          organizationId: session.organizationId,
          platformId: session.platformId,
          eventType: "session.ended",
          payload: { sessionId: session.id, gameId: session.gameId },
        },
        tx,
      );
    });

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
        deps.encryptionKey,
      );

      if (input.body.configId !== undefined && resolved === null) {
        throw new NotFoundError("game config not found");
      }

      const config = resolved ?? { id: null, config: {}, schemaVersion: 1, scoreVerificationCallbackSecretCiphertext: null };

      let gameFileId: string | null = null;

      if (game.hosting === "external" && input.body.gameFileId !== undefined) {
        throw new BadRequestError("an external game has no game files");
      }

      if (input.body.gameFileId !== undefined) {
        const [pinned] = await db
          .select({ id: gameFile.id })
          .from(gameFile)
          .where(
            scopeTo(
              scope,
              gameFile,
              eq(gameFile.id, input.body.gameFileId),
              eq(gameFile.gameId, input.body.gameId),
              eq(gameFile.status, "ready"),
            ),
          )
          .limit(1);
        if (pinned === undefined) throw new NotFoundError("game file not found");
        gameFileId = pinned.id;
      } else if (game.hosting === "hosted") {
        const file = await readCurrentGameFile(db, scope, input.body.gameId);
        if (file === null) throw new BadRequestError("a hosted game needs a ready game file");
        gameFileId = file.id;
      }

      const settings = readGameConfig(config.config);

      const mode = deps.verifier === null ? "none" : settings.verificationMode;


      if (deps.usage !== null) {
        await deps.usage.checkQuota({
          organizationId: scope.organizationId,
          metric: "sessions_created",
        });
      }

      const durationSeconds = settings.sessionDurationSeconds;
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

      const row = await db.transaction(async (tx) => {
        const [inserted] = await tx
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
            externalName: input.body.externalName ?? null,
            mode: input.body.mode ?? null,
            status: "active",
            tokenHash: sha256Hex(sessionToken),
            scoreVerificationMode: mode,
            scoreVerificationCallbackSecretCiphertext: config.scoreVerificationCallbackSecretCiphertext,
            configSnapshot: config.config,
            configSchemaVersion: config.schemaVersion,
            metadata: input.body.metadata ?? {},
            expiresAt,
          })
          .returning();

        if (inserted === undefined)
          throw new InternalServerError("game session insert returned no row");

        await deps.dispatcher.dispatch(
          {
            organizationId: inserted.organizationId,
            platformId: inserted.platformId,
            eventType: "session.created",
            payload: toView(inserted),
          },
          tx,
        );

        return inserted;
      });

      if (deps.usage !== null) {
        await deps.usage.incr({
          organizationId: scope.organizationId,
          platformId: input.platformId,
          metric: "sessions_created",
        });
      }

      const session = toView(row);

      const [namedPlatform] = await db
        .select({ slug: platform.slug })
        .from(platform)
        .where(scopeTo(scope, platform, eq(platform.id, row.platformId)))
        .limit(1);

      const [namedGame] = await db
        .select({ slug: gameTable.slug })
        .from(gameTable)
        .where(scopeTo(scope, gameTable, eq(gameTable.id, row.gameId)))
        .limit(1);

      if (namedPlatform === undefined || namedGame === undefined) {
        throw new InternalServerError("game session names its platform and game");
      }

      let code: string | null = null;

      for (let attempt = 0; attempt < 5 && code === null; attempt += 1) {
        let candidate = "";
        for (let i = 0; i < 10; i += 1) {
          candidate += JOIN_CODE_ALPHABET[randomInt(0, JOIN_CODE_ALPHABET.length)];
        }

        try {
          await db.insert(joinCode).values({
            id: newId(),
            organizationId: scope.organizationId,
            sessionId: row.id,
            gameId: row.gameId,
            platformId: row.platformId,
            codeHash: sha256Hex(candidate),
            expiresAt: row.expiresAt,
          });
          code = candidate;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }

      if (code === null) throw new InternalServerError("a join code could not be issued");

      let file: PlayUrlFile = null;
      if (row.gameFileId !== null) {
        const [build] = await db
          .select({
            kind: gameFile.kind,
            objectKey: gameFile.objectKey,
            entryPoint: gameFile.entryPoint,
            servedPrefix: gameFile.servedPrefix,
          })
          .from(gameFile)
          .where(scopeTo(scope, gameFile, eq(gameFile.id, row.gameFileId)))
          .limit(1);
        if (build !== undefined) file = build;
      }

      const playUrl = gamePlayUrl({
        storage: deps.storage,
        apiBaseUrl: deps.apiBaseUrl,
        platformSlug: namedPlatform.slug,
        gameSlug: namedGame.slug,
        file,
        tournamentId: row.tournamentId,
        matchId: row.matchId,
        externalUserId: row.externalUserId,
        code,
      });
      const realtimeBase = deps.realtimeBaseUrl.replace(/\/+$/, "");
      const realtimeUrl = `${realtimeBase}${REALTIME_PATH}/${row.id}?token=${encodeURIComponent(sessionToken)}`;

      return {
        session,
        sessionToken,
        realtimeUrl,
        joinCode: code,
        playUrl,
      };
    },

    async get(scope: Scope, sessionId: string): Promise<GameSessionView> {
      return toView(await readGameSessionRow(db, scope, sessionId));
    },

    async end(scope: Scope, sessionId: string, platformId?: string): Promise<GameSessionView> {
      const current = await readGameSessionRow(db, scope, sessionId);

      if (platformId !== undefined && current.platformId !== platformId) {
        throw new NotFoundError("game session not found");
      }

      if (current.status === "ended") return toView(current);

      await endSession(scope, current, new Date());

      return toView(await readGameSessionRow(db, scope, sessionId));
    },

    endSession,
  };
}
