import { and, asc, eq, inArray } from "drizzle-orm";
import type { BracketMatchView, BracketView } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import {
  match,
  matchParticipant,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { badRequest, conflict, newId } from "@wasanni/kit";
import type { Scope } from "@wasanni/kit";
import { activateIfSeated, seatParticipant } from "./advancement.ts";
import { buildBracket, bracketSize, nextSideOf, nextSlotOf } from "./bracket.ts";
import { readTournamentRow } from "./tournament.service.ts";
import type {
  MatchParticipantRow,
  MatchRow,
  TournamentParticipantRow,
} from "./types.ts";
import { toMatchParticipantView } from "./views.ts";

async function readBracketRows(db: Db, tournamentId: string): Promise<MatchRow[]> {
  return db
    .select()
    .from(match)
    .where(eq(match.tournamentId, tournamentId))
    .orderBy(asc(match.bracketRound), asc(match.bracketSlot));
}

async function readSeated(
  db: Db,
  matchIds: string[],
): Promise<MatchParticipantRow[]> {
  if (matchIds.length === 0) return [];

  return db
    .select()
    .from(matchParticipant)
    .where(inArray(matchParticipant.matchId, matchIds))
    .orderBy(asc(matchParticipant.slot));
}

const groupByMatch = (
  rows: MatchParticipantRow[],
): Map<string, MatchParticipantRow[]> => {
  const grouped = new Map<string, MatchParticipantRow[]>();

  for (const row of rows) {
    const list = grouped.get(row.matchId) ?? [];
    list.push(row);
    grouped.set(row.matchId, list);
  }

  return grouped;
};

export function createBracketService(db: Db) {
  const readBracket = async (
    scope: Scope,
    tournamentId: string,
  ): Promise<BracketView> => {
    const current = await readTournamentRow(db, scope, tournamentId);

    if (current.format !== "bracket") {
      throw badRequest("only a bracket tournament has a bracket");
    }

    const matches = await readBracketRows(db, tournamentId);
    const seated = groupByMatch(
      await readSeated(
        db,
        matches.map((row) => row.id),
      ),
    );

    const totalRounds = Math.max(
      0,
      ...matches.map((row) => (row.bracketRound === null ? 0 : row.bracketRound)),
    );

    const grouped = new Map<number, BracketMatchView[]>();
    for (const row of matches) {
      if (row.bracketRound === null || row.bracketSlot === null) continue;

      const finalRound = row.bracketRound === totalRounds;
      const view: BracketMatchView = {
        id: row.id,
        tournamentId,
        bracketRound: row.bracketRound,
        bracketSlot: row.bracketSlot,
        status: row.status,
        name: row.name,
        winnerParticipantId: row.winnerParticipantId,
        nextRound: finalRound ? null : row.bracketRound + 1,
        nextSlot: finalRound ? null : nextSlotOf(row.bracketSlot),
        nextSide: finalRound ? null : nextSideOf(row.bracketSlot),
        participants: (seated.get(row.id) ?? []).map(toMatchParticipantView),
      };

      const list = grouped.get(row.bracketRound) ?? [];
      list.push(view);
      grouped.set(row.bracketRound, list);
    }

    const rounds = [...grouped.entries()]
      .sort(([left], [right]) => left - right)
      .map(([round, list]) => ({ round, matches: list }));

    const unfinished = rounds.find((entry) =>
      entry.matches.some((item) => item.status !== "completed"),
    );

    return {
      tournamentId,
      bracketSize: bracketSize(2 ** Math.max(1, totalRounds)),
      totalRounds,
      currentRound: unfinished === undefined ? null : unfinished.round,
      rounds,
    };
  };

  const generateBracket = async (
    scope: Scope,
    tournamentId: string,
  ): Promise<BracketView> => {
    const current = await readTournamentRow(db, scope, tournamentId);

    if (current.format !== "bracket") {
      throw badRequest("only a bracket tournament has a bracket");
    }
    if (current.status !== "open") {
      throw conflict("the tournament must be open before seeding");
    }

    const registered = await db
      .select()
      .from(tournamentParticipant)
      .where(
        and(
          eq(tournamentParticipant.tournamentId, tournamentId),
          eq(tournamentParticipant.status, "registered"),
        ),
      );

    if (registered.length < 2) {
      throw badRequest("a bracket needs at least 2 registered participants");
    }

    const ordered = [...registered].sort((left, right) => {
      const bySeed = (left.seed ?? Number.MAX_SAFE_INTEGER) -
        (right.seed ?? Number.MAX_SAFE_INTEGER);
      if (bySeed !== 0) return bySeed;
      return left.registeredAt.getTime() - right.registeredAt.getTime();
    });

    const bySeed = new Map<number, TournamentParticipantRow>();
    ordered.forEach((participant, index) => {
      bySeed.set(index + 1, participant);
    });

    const nodes = buildBracket(ordered.length);
    const startedAt = new Date();

    await db.transaction(async (tx) => {
      const ids = new Map<string, string>();
      for (const node of nodes) {
        ids.set(`${node.round}:${node.slot}`, newId());
      }

      const at = (round: number, slot: number): string | undefined =>
        ids.get(`${round}:${slot}`);

      for (const node of nodes) {
        const id = at(node.round, node.slot);
        if (id === undefined) continue;

        await tx.insert(match).values({
          id,
          organizationId: current.organizationId,
          gameId: current.gameId,
          tournamentId,
          name: `Round ${node.round} · Match ${node.slot + 1}`,
          bracketRound: node.round,
          bracketSlot: node.slot,
          status: "pending",
        });
      }

      for (const node of nodes) {
        if (node.round !== 1) continue;

        const matchId = at(node.round, node.slot);
        if (matchId === undefined) continue;

        const sides: { slot: number; seed: number }[] = [];
        if (node.homeSeed !== null) sides.push({ slot: 0, seed: node.homeSeed });
        if (node.awaySeed !== null) sides.push({ slot: 1, seed: node.awaySeed });
        if (sides.length === 0) continue;

        let winnerId: string | null = null;

        for (const side of sides) {
          const participant = bySeed.get(side.seed);
          if (participant === undefined) continue;

          const participantId = newId();
          await tx.insert(matchParticipant).values({
            id: participantId,
            matchId,
            slot: side.slot,
            platformId: participant.platformId,
            externalUserId: participant.externalUserId,
            displayName: participant.displayName,
            seed: side.seed,
          });

          if (sides.length === 1) winnerId = participantId;
        }

        if (sides.length === 2) continue;

        await tx
          .update(match)
          .set({
            status: "completed",
            winnerParticipantId: winnerId,
            completedAt: startedAt,
            updatedAt: startedAt,
          })
          .where(eq(match.id, matchId));

        if (
          node.nextRound === null ||
          node.nextSlot === null ||
          node.nextSide === null
        ) {
          continue;
        }

        const side = sides[0];
        const nextId = at(node.nextRound, node.nextSlot);
        const bye = side === undefined ? undefined : bySeed.get(side.seed);
        if (side === undefined || nextId === undefined || bye === undefined) {
          continue;
        }

        await seatParticipant(tx, {
          matchId: nextId,
          slot: node.nextSide,
          platformId: bye.platformId,
          externalUserId: bye.externalUserId,
          displayName: bye.displayName,
          seed: side.seed,
        });
      }

      for (const node of nodes) {
        const id = at(node.round, node.slot);
        if (id === undefined) continue;
        await activateIfSeated(tx, id);
      }

      await tx
        .update(tournament)
        .set({ status: "running", startedAt, updatedAt: startedAt })
        .where(eq(tournament.id, tournamentId));
    });

    return readBracket(scope, tournamentId);
  };

  return { readBracket, generateBracket };
}
