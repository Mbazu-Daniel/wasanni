import { and, eq } from "drizzle-orm";
import {
  match,
  matchParticipant,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { newId } from "@wasanni/kit";
import { nextSideOf, nextSlotOf } from "./bracket.ts";
import type { Executor, MatchRow } from "./types.ts";

export async function seatParticipant(
  exec: Executor,
  input: {
    matchId: string;
    slot: number;
    platformId: string;
    externalUserId: string;
    displayName: string | null;
    seed: number | null;
  },
): Promise<boolean> {
  const inserted = await exec
    .insert(matchParticipant)
    .values({
      id: newId(),
      matchId: input.matchId,
      slot: input.slot,
      platformId: input.platformId,
      externalUserId: input.externalUserId,
      displayName: input.displayName,
      seed: input.seed,
    })
    .onConflictDoNothing({
      target: [matchParticipant.matchId, matchParticipant.slot],
    })
    .returning({ id: matchParticipant.id });

  return inserted.length > 0;
}

export async function activateIfSeated(
  exec: Executor,
  matchId: string,
): Promise<void> {
  const seated = await exec
    .select({ id: matchParticipant.id })
    .from(matchParticipant)
    .where(eq(matchParticipant.matchId, matchId));

  if (seated.length < 2) return;

  await exec
    .update(match)
    .set({ status: "active", startedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(match.id, matchId), eq(match.status, "pending")));
}

export async function advanceWinner(
  exec: Executor,
  current: MatchRow,
  winnerId: string,
): Promise<void> {
  if (
    current.tournamentId === null ||
    current.bracketRound === null ||
    current.bracketSlot === null
  ) {
    return;
  }

  const [next] = await exec
    .select({ id: match.id })
    .from(match)
    .where(
      and(
        eq(match.tournamentId, current.tournamentId),
        eq(match.bracketRound, current.bracketRound + 1),
        eq(match.bracketSlot, nextSlotOf(current.bracketSlot)),
      ),
    )
    .limit(1);

  if (next === undefined) return;

  const [winner] = await exec
    .select()
    .from(matchParticipant)
    .where(eq(matchParticipant.id, winnerId))
    .limit(1);

  if (winner === undefined) return;

  const seated = await seatParticipant(exec, {
    matchId: next.id,
    slot: nextSideOf(current.bracketSlot),
    platformId: winner.platformId,
    externalUserId: winner.externalUserId,
    displayName: winner.displayName,
    seed: winner.seed,
  });

  if (!seated) return;

  await activateIfSeated(exec, next.id);
}

export async function settleTournament(
  exec: Executor,
  tournamentId: string,
): Promise<void> {
  const matches = await exec
    .select({
      round: match.bracketRound,
      status: match.status,
      winnerParticipantId: match.winnerParticipantId,
    })
    .from(match)
    .where(eq(match.tournamentId, tournamentId));

  if (matches.length === 0) return;
  if (!matches.every((row) => row.status === "completed")) return;

  const finalRound = Math.max(
    ...matches.map((row) => (row.round === null ? 0 : row.round)),
  );
  const finalMatch = matches.find((row) => row.round === finalRound);

  if (finalMatch?.winnerParticipantId) {
    const [winner] = await exec
      .select({
        platformId: matchParticipant.platformId,
        externalUserId: matchParticipant.externalUserId,
      })
      .from(matchParticipant)
      .where(eq(matchParticipant.id, finalMatch.winnerParticipantId))
      .limit(1);

    if (winner !== undefined) {
      await exec
        .update(tournamentParticipant)
        .set({ status: "winner" })
        .where(
          and(
            eq(tournamentParticipant.tournamentId, tournamentId),
            eq(tournamentParticipant.platformId, winner.platformId),
            eq(tournamentParticipant.externalUserId, winner.externalUserId),
          ),
        );
    }
  }

  await exec
    .update(tournament)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(tournament.id, tournamentId), eq(tournament.status, "running")),
    );
}
