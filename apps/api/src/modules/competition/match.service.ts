import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { MatchList, MatchOutcome, MatchParticipantView, MatchView } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import { game, match, matchParticipant } from "@wasanni/db/schema";
import { BadRequestError, ConflictError, newId, NotFoundError } from "@wasanni/kit";
import type { Scope } from "@wasanni/kit";
import { afterCursor, decodeCursor, paginate } from "../../pagination.ts";
import type { UsageService } from "../usage/types.ts";
import { activateIfSeated } from "./advancement.ts";
import { readTournamentRow } from "./tournament.service.ts";
import { settleMatch } from "./result.ts";
import type {
  CompleteMatchInput,
  CreateMatchInput,
  MatchListFilter,
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

export function createMatchService(db: Db, usage: UsageService | null) {
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

    const seated = await db
      .select()
      .from(matchParticipant)
      .where(eq(matchParticipant.matchId, current.id));

    const outcomes =
      winnerId === null
        ? []
        : [
            { participantId: winnerId, outcome: "won" as const, placement: 1 },
            ...seated
              .filter((row) => row.id !== winnerId && row.outcome === "pending")
              .map((row) => ({
                participantId: row.id,
                outcome: "lost" as const,
                placement: row.placement,
              })),
          ];

    const updated = await settleMatch(db, current, { winnerId, outcomes });

    if (updated === null) {
      return toMatchView(await readMatchRow(db, scope, input.matchId));
    }

    return toMatchView(updated);
  };

  const autoComplete = async (current: MatchRow): Promise<void> => {
    const seated = await db
      .select()
      .from(matchParticipant)
      .where(eq(matchParticipant.matchId, current.id));

    const eligible = seated.filter((row) => row.outcome !== "disqualified");

    if (eligible.length < 2) return;
    if (eligible.some((row) => row.score === null)) return;

    const ranked = [...eligible].sort((left, right) => {
      const difference = (right.score ?? 0) - (left.score ?? 0);
      return difference === 0 ? left.id.localeCompare(right.id) : difference;
    });

    const top = ranked[0];
    if (top === undefined) return;

    const tied =
      ranked.filter((row) => (row.score ?? 0) === (top.score ?? 0)).length > 1;

    const outcomes = ranked.map((row, index) => ({
      participantId: row.id,
      outcome: (tied ? "draw" : index === 0 ? "won" : "lost") as MatchOutcome,
      placement: tied ? null : index + 1,
    }));

    await settleMatch(db, current, { winnerId: tied ? null : top.id, outcomes });
  };

  return {
    async create(scope: Scope, input: CreateMatchInput): Promise<MatchView> {
      const { body } = input;

      await requireGame(db, scope, body.gameId);

      if (body.tournamentId !== undefined) {
        if (body.participants.length !== 2) {
          throw new BadRequestError("a tournament match has exactly two sides");
        }

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
      }).then(async (view) => {
        if (usage !== null) {
          await usage.incr({
            organizationId: scope.organizationId,
            platformId: null,
            metric: "matches_created",
          });
        }

        return view;
      });
    },

    async get(scope: Scope, matchId: string): Promise<MatchView> {
      return toMatchView(await readMatchRow(db, scope, matchId));
    },

    async listForOrganization(
      scope: Scope,
      filter: MatchListFilter = {},
    ): Promise<MatchList> {
      const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
      const cursor =
        filter.cursor === undefined ? null : decodeCursor(filter.cursor);

      const conditions = [
        filter.gameId === undefined ? undefined : eq(match.gameId, filter.gameId),
        filter.tournamentId === undefined
          ? undefined
          : eq(match.tournamentId, filter.tournamentId),
        filter.status === undefined ? undefined : eq(match.status, filter.status),
      ];

      if (cursor !== null) {
        conditions.push(afterCursor(match.createdAt, match.id, cursor));
      }

      const rows = await db
        .select()
        .from(match)
        .where(scopeTo(scope, match, ...conditions))
        .orderBy(desc(match.createdAt), desc(match.id))
        .limit(limit + 1);

      const { items, page } = paginate(rows, limit);
      const matchIds = items.map((row) => row.id);

      const seated =
        matchIds.length === 0
          ? []
          : await db
              .select()
              .from(matchParticipant)
              .where(inArray(matchParticipant.matchId, matchIds))
              .orderBy(asc(matchParticipant.slot));

      const byMatch = new Map<string, typeof seated>();
      for (const participant of seated) {
        const list = byMatch.get(participant.matchId) ?? [];
        list.push(participant);
        byMatch.set(participant.matchId, list);
      }

      return {
        data: items.map((row) => ({
          match: toMatchView(row),
          participants: (byMatch.get(row.id) ?? []).map(toMatchParticipantView),
        })),
        page,
      };
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

      await autoComplete(current);
    },
  };
}
