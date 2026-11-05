import { and, desc, eq } from "drizzle-orm";
import type {
  ParticipantSessionList,
  Standings,
  TournamentLeaderboard,
} from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import {
  gameSession,
  gameSessionScore,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { ConflictError, NotFoundError, type Scope } from "@wasanni/kit";
import { readTournamentRow } from "./tournament.service.ts";
import type { BracketService } from "./types.ts";

export function createStandingsService(
  db: Db,
  deps: { bracket: BracketService },
) {
  const readLeaderboard = async (
    scope: Scope,
    tournamentId: string,
  ): Promise<TournamentLeaderboard> => {
    const best = await db
      .selectDistinctOn([gameSessionScore.externalUserId])
      .from(gameSessionScore)
      .innerJoin(gameSession, eq(gameSession.id, gameSessionScore.sessionId))
      .where(
        scopeTo(
          scope,
          gameSessionScore,
          eq(gameSession.tournamentId, tournamentId),
          eq(gameSessionScore.status, "accepted"),
        ),
      )
      .orderBy(
        gameSessionScore.externalUserId,
        desc(gameSessionScore.score),
        gameSessionScore.submittedAt,
      );

    const registrations = await db
      .select({
        id: tournamentParticipant.id,
        externalUserId: tournamentParticipant.externalUserId,
        displayName: tournamentParticipant.displayName,
        seed: tournamentParticipant.seed,
        status: tournamentParticipant.status,
      })
      .from(tournamentParticipant)
      .where(
        and(
          eq(tournamentParticipant.tournamentId, tournamentId),
          eq(tournamentParticipant.status, "registered"),
        ),
      );

    const scoreByUser = new Map(
      best.map((row) => [row.game_session_score.externalUserId, row.game_session_score]),
    );

    const rows = registrations
      .map((registration) => {
        const score = scoreByUser.get(registration.externalUserId);

        return {
          participantId: registration.id,
          externalUserId: registration.externalUserId,
          displayName: registration.displayName,
          seed: registration.seed,
          status: registration.status,
          score: score?.score ?? null,
          flagged: score?.flagged ?? false,
          flags: score?.flags ?? [],
          submittedAt: score?.submittedAt?.toISOString() ?? null,
        };
      })
      .sort((left, right) => {
        const leftScore = left.score ?? -1;
        const rightScore = right.score ?? -1;

        if (leftScore !== rightScore) return rightScore - leftScore;
        if (left.seed !== null && right.seed !== null && left.seed !== right.seed) {
          return left.seed - right.seed;
        }
        if (left.seed !== null && right.seed === null) return -1;
        if (left.seed === null && right.seed !== null) return 1;
        if (left.submittedAt !== null && right.submittedAt !== null) {
          const bySubmittedAt = left.submittedAt.localeCompare(right.submittedAt);
          if (bySubmittedAt !== 0) return bySubmittedAt;
        }

        return left.externalUserId.localeCompare(right.externalUserId);
      });

    return {
      rows: rows.map((row, index) => ({ position: index + 1, ...row })),
    };
  };

  return {
    async leaderboards(scope: Scope, tournamentId: string) {
      const current = await readTournamentRow(db, scope, tournamentId);
      if (current.format === "bracket") {
        throw new ConflictError("only a leaderboard tournament has a leaderboard");
      }
      return readLeaderboard(scope, tournamentId);
    },
    async read(scope: Scope, tournamentId: string): Promise<Standings> {
      const current = await readTournamentRow(db, scope, tournamentId);

      if (current.format === "bracket") {
        return {
          format: "bracket",
          bracket: await deps.bracket.readBracket(scope, tournamentId),
        };
      }

      return {
        format: "leaderboard",
        rows: (await readLeaderboard(scope, tournamentId)).rows,
      };
    },

    async sessionsOf(
      scope: Scope,
      tournamentId: string,
      participantId: string,
    ): Promise<ParticipantSessionList> {
      await readTournamentRow(db, scope, tournamentId);

      const [registration] = await db
        .select({
          platformId: tournamentParticipant.platformId,
          externalUserId: tournamentParticipant.externalUserId,
        })
        .from(tournamentParticipant)
        .where(
          and(
            eq(tournamentParticipant.id, participantId),
            eq(tournamentParticipant.tournamentId, tournamentId),
          ),
        )
        .limit(1);

      if (registration === undefined) throw new NotFoundError("participant not found");

      const rows = await db
        .select({
          sessionId: gameSession.id,
          status: gameSession.status,
          startedAt: gameSession.startedAt,
          score: gameSessionScore.score,
          flagged: gameSessionScore.flagged,
          flags: gameSessionScore.flags,
          submittedAt: gameSessionScore.submittedAt,
        })
        .from(gameSession)
        .leftJoin(gameSessionScore, eq(gameSessionScore.sessionId, gameSession.id))
        .where(
          scopeTo(
            scope,
            gameSession,
            eq(gameSession.tournamentId, tournamentId),
            eq(gameSession.platformId, registration.platformId),
            eq(gameSession.externalUserId, registration.externalUserId),
          ),
        )
        .orderBy(desc(gameSession.startedAt));

      return {
        sessions: rows.map((row) => ({
          sessionId: row.sessionId,
          status: row.status,
          score: row.score ?? null,
          flagged: row.flagged ?? false,
          flags: row.flags ?? [],
          startedAt: row.startedAt.toISOString(),
          submittedAt: row.submittedAt === null ? null : row.submittedAt.toISOString(),
        })),
      };
    },
  };
}
