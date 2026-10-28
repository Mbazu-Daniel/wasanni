import { desc, eq } from "drizzle-orm";
import type { Standings } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import {
  gameSession,
  gameSessionScore,
  tournamentParticipant,
} from "@wasanni/db/schema";
import type { Scope } from "@wasanni/kit";
import { readTournamentRow } from "./tournament.service.ts";
import type { BracketService } from "./types.ts";

export function createStandingsService(
  db: Db,
  deps: { bracket: BracketService },
) {
  const readLeaderboard = async (
    scope: Scope,
    tournamentId: string,
  ): Promise<Standings> => {
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
      .where(eq(tournamentParticipant.tournamentId, tournamentId));

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
        if (left.seed !== null && right.seed !== null) return left.seed - right.seed;

        return 0;
      });

    return {
      format: "leaderboard",
      rows: rows.map((row, index) => ({ position: index + 1, ...row })),
    };
  };

  return {
    async read(scope: Scope, tournamentId: string): Promise<Standings> {
      const current = await readTournamentRow(db, scope, tournamentId);

      if (current.format === "bracket") {
        return {
          format: "bracket",
          bracket: await deps.bracket.readBracket(scope, tournamentId),
        };
      }

      return readLeaderboard(scope, tournamentId);
    },
  };
}
