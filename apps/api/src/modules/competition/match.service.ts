import { and, asc, eq, inArray, ne } from "drizzle-orm";
import type { MatchParticipantView, MatchView } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import { game, match, matchParticipant } from "@wasanni/db/schema";
import { BadRequestError, ConflictError, newId, NotFoundError } from "@wasanni/kit";
import type { Scope } from "@wasanni/kit";
import {
  advanceWinner,
  activateIfSeated,
  settleTournament,
} from "./advancement.ts";
import { readTournamentRow } from "./tournament.service.ts";
import type {
  CompleteMatchInput,
  CreateMatchInput,
  MatchRow,
  RecordParticipantScoreInput,
} from "./types.ts";
import { toMatchParticipantView, toMatchView } from "./views.ts";

async function readMatchRow(
  db: Db,
  scope: Scope,
  matchId: string,
): Promise<MatchRow> {
  const [row] = await db
    .select()
    .from(match)
    .where(scopeTo(scope, match, eq(match.id, matchId)))
    .limit(1);

  if (row === undefined) throw new NotFoundError("match not found");
  return row;
}

async function requireGame(db: Db, scope: Scope, gameId: string): Promise<void> {
  const [row] = await db
    .select({ id: game.id })
    .from(game)
    .where(scopeTo(scope, game, eq(game.id, gameId)))
    .limit(1);

  if (row === undefined) throw new NotFoundError("game not found");
}

export function createMatchService(db: Db) {
  const complete = async (
    scope: Scope,
    input: CompleteMatchInput,
  ): Promise<MatchView> => {
    const current = await readMatchRow(db, scope, input.matchId);

    if (current.status === "cancelled") {
      throw new ConflictError("a cancelled match cannot be completed");
    }
    if (current.status === "completed") return toMatchView(current);

    let winnerId = input.winnerParticipantId ?? null;

    if (winnerId === null && input.winnerExternal !== undefined) {
      const [seated] = await db
        .select({ id: matchParticipant.id })
        .from(matchParticipant)
        .where(
          and(
            eq(matchParticipant.matchId, current.id),
            eq(matchParticipant.platformId, input.winnerExternal.platformId),
            eq(
              matchParticipant.externalUserId,
              input.winnerExternal.externalUserId,
            ),
          ),
        )
        .limit(1);

      if (seated === undefined) throw new NotFoundError("winning participant not found");
      winnerId = seated.id;
    }

    const completedAt = new Date();

    const [updated] = await db
      .update(match)
      .set({
        status: "completed",
        winnerParticipantId: winnerId,
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

    if (updated === undefined) {
      return toMatchView(await readMatchRow(db, scope, input.matchId));
    }

    if (winnerId !== null) {
      await db
        .update(matchParticipant)
        .set({ outcome: "won", placement: 1, updatedAt: completedAt })
        .where(eq(matchParticipant.id, winnerId));

      await db
        .update(matchParticipant)
        .set({ outcome: "lost", updatedAt: completedAt })
        .where(
          and(
            eq(matchParticipant.matchId, current.id),
            ne(matchParticipant.id, winnerId),
            eq(matchParticipant.outcome, "pending"),
          ),
        );

      await advanceWinner(db, updated, winnerId);
    }

    if (updated.tournamentId !== null) {
      await settleTournament(db, updated.tournamentId);
    }

    return toMatchView(updated);
  };

  const autoComplete = async (scope: Scope, current: MatchRow): Promise<void> => {
    const seated = await db
      .select()
      .from(matchParticipant)
      .where(eq(matchParticipant.matchId, current.id));

    if (seated.length < 2) return;
    if (seated.some((row) => row.score === null)) return;

    const ranked = [...seated].sort((left, right) => {
      const difference = (right.score ?? 0) - (left.score ?? 0);
      return difference === 0 ? left.id.localeCompare(right.id) : difference;
    });

    const top = ranked[0];
    if (top === undefined) return;

    const tied =
      ranked.filter((row) => (row.score ?? 0) === (top.score ?? 0)).length > 1;
    const now = new Date();

    await db.transaction(async (tx) => {
      for (const [index, row] of ranked.entries()) {
        await tx
          .update(matchParticipant)
          .set({
            placement: tied ? null : index + 1,
            outcome: tied ? "draw" : index === 0 ? "won" : "lost",
            updatedAt: now,
          })
          .where(eq(matchParticipant.id, row.id));
      }
    });

    await complete(scope, {
      matchId: current.id,
      ...(tied ? {} : { winnerParticipantId: top.id }),
    });
  };

  return {
    async create(scope: Scope, input: CreateMatchInput): Promise<MatchView> {
      const { body } = input;

      await requireGame(db, scope, body.gameId);

      if (body.tournamentId !== undefined) {
        const current = await readTournamentRow(db, scope, body.tournamentId);

        if (current.gameId !== body.gameId) {
          throw new BadRequestError("the match and the tournament must share a game");
        }
      }

      const identities = new Set<string>();
      for (const participant of body.participants) {
        const key = `${participant.platformId}:${participant.externalUserId}`;
        if (identities.has(key)) {
          throw new BadRequestError("a participant appears twice in the same match");
        }
        identities.add(key);
      }

      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(match)
          .values({
            id: newId(),
            organizationId: scope.organizationId,
            gameId: body.gameId,
            tournamentId: body.tournamentId ?? null,
            name: body.name ?? null,
            status: "pending",
          })
          .returning();

        if (row === undefined) throw new NotFoundError("match not found");

        for (const [index, participant] of body.participants.entries()) {
          await tx.insert(matchParticipant).values({
            id: newId(),
            matchId: row.id,
            slot: index,
            platformId: participant.platformId,
            externalUserId: participant.externalUserId,
            displayName: participant.displayName ?? null,
          });
        }

        await activateIfSeated(tx, row.id);

        const [created] = await tx
          .select()
          .from(match)
          .where(eq(match.id, row.id))
          .limit(1);

        return toMatchView(created ?? row);
      });
    },

    async get(scope: Scope, matchId: string): Promise<MatchView> {
      return toMatchView(await readMatchRow(db, scope, matchId));
    },

    async listParticipants(
      scope: Scope,
      matchId: string,
    ): Promise<MatchParticipantView[]> {
      const current = await readMatchRow(db, scope, matchId);

      const rows = await db
        .select()
        .from(matchParticipant)
        .where(eq(matchParticipant.matchId, current.id))
        .orderBy(asc(matchParticipant.slot));

      return rows.map(toMatchParticipantView);
    },

    complete,

    async recordParticipantScore(
      scope: Scope,
      input: RecordParticipantScoreInput,
    ): Promise<void> {
      const [current] = await db
        .select()
        .from(match)
        .where(scopeTo(scope, match, eq(match.id, input.matchId)))
        .limit(1);

      if (current === undefined) return;
      if (current.status === "completed" || current.status === "cancelled") {
        return;
      }

      const updated = await db
        .update(matchParticipant)
        .set({
          sessionId: input.sessionId,
          score: input.score,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(matchParticipant.matchId, current.id),
            eq(matchParticipant.platformId, input.platformId),
            eq(matchParticipant.externalUserId, input.externalUserId),
          ),
        )
        .returning({ id: matchParticipant.id });

      if (updated.length === 0) return;

      await autoComplete(scope, current);
    },
  };
}
