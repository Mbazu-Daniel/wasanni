import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { match, matchParticipant } from "@wasanni/db/schema";
import type { MatchOutcome } from "@wasanni/contracts";
import { advanceWinner, settleTournament } from "./advancement.ts";
import type { MatchRow } from "./types.ts";

export type MatchResult = {
  winnerId: string | null;
  outcomes: {
    participantId: string;
    outcome: MatchOutcome;
    placement: number | null;
  }[];
};

export const settleMatch = async (
  db: Db,
  current: MatchRow,
  result: MatchResult,
): Promise<MatchRow | null> => {
  const completedAt = new Date();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(match)
      .set({
        status: "completed",
        winnerParticipantId: result.winnerId,
        completedAt,
        updatedAt: completedAt,
      })
      .where(
        and(
          eq(match.id, current.id),
          inArray(match.status, ["pending", "active"]),
        ),
      )
      .returning();

    if (updated === undefined) return null;

    for (const outcome of result.outcomes) {
      await tx
        .update(matchParticipant)
        .set({
          outcome: outcome.outcome,
          placement: outcome.placement,
          updatedAt: completedAt,
        })
        .where(eq(matchParticipant.id, outcome.participantId));
    }

    if (result.winnerId !== null) {
      await advanceWinner(tx, updated, result.winnerId);
    }

    if (updated.tournamentId !== null) {
      await settleTournament(tx, updated.tournamentId);
    }

    return updated;
  });
};
