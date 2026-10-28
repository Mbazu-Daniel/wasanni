import { desc, eq, sql } from "drizzle-orm";
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
    const best = sql<number>`max(${gameSessionScore.score})::double precision`;

    const rows = await db
      .select({
        externalUserId: gameSessionScore.externalUserId,
        score: best.as("score"),
        flagged: sql<boolean>`bool_or(${gameSessionScore.flagged})`.as("flagged"),
      })
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
      .groupBy(gameSessionScore.externalUserId)
      .orderBy(desc(best))
      .limit(200);

    const registrations = await db
      .select({
        externalUserId: tournamentParticipant.externalUserId,
        displayName: tournamentParticipant.displayName,
      })
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.tournamentId, tournamentId));

    const names = new Map<string, string | null>();
    for (const row of registrations) {
      names.set(row.externalUserId, row.displayName);
    }

    return {
      format: "leaderboard",
      rows: rows.map((row, index) => ({
        position: index + 1,
        externalUserId: row.externalUserId,
        displayName: names.get(row.externalUserId) ?? null,
        score: row.score,
        flagged: row.flagged,
      })),
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
