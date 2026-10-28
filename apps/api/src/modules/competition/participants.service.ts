import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import {
  match,
  matchParticipant,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { ConflictError, InternalServerError, newId, NotFoundError } from "@wasanni/kit";
import type { Scope } from "@wasanni/kit";
import type { ParticipantView } from "@wasanni/contracts";
import type {
  RegisterParticipantInput,
  WithdrawTarget,
} from "./types.ts";
import { toParticipantView } from "./views.ts";
import { readTournamentRow } from "./tournament.service.ts";
import { settleMatch } from "./result.ts";

export function createParticipantsService(db: Db) {
  const readRow = (scope: Scope, tournamentId: string) =>
    readTournamentRow(db, scope, tournamentId);

  return {
    async register(
      scope: Scope,
      input: RegisterParticipantInput,
    ): Promise<ParticipantView> {
      const current = await readRow(scope, input.tournamentId);

      if (current.status !== "open") {
        throw new ConflictError("registration is not open");
      }

      const [existing] = await db
        .select()
        .from(tournamentParticipant)
        .where(
          and(
            eq(tournamentParticipant.tournamentId, current.id),
            eq(tournamentParticipant.platformId, input.platformId),
            eq(tournamentParticipant.externalUserId, input.externalUserId),
          ),
        )
        .limit(1);

      if (existing !== undefined) {
        if (existing.status !== "withdrawn") return toParticipantView(existing);

        const [revived] = await db
          .update(tournamentParticipant)
          .set({
            status: "registered",
            withdrawnAt: null,
            displayName: input.displayName ?? existing.displayName,
          })
          .where(eq(tournamentParticipant.id, existing.id))
          .returning();

        if (revived === undefined) throw new NotFoundError("registration not found");
        return toParticipantView(revived);
      }

      if (current.maxParticipants !== null) {
        const registered = await db
          .select({ id: tournamentParticipant.id })
          .from(tournamentParticipant)
          .where(
            and(
              eq(tournamentParticipant.tournamentId, current.id),
              eq(tournamentParticipant.status, "registered"),
            ),
          );

        if (registered.length >= current.maxParticipants) {
          throw new ConflictError("tournament is full");
        }
      }

      const [row] = await db
        .insert(tournamentParticipant)
        .values({
          id: newId(),
          organizationId: scope.organizationId,
          tournamentId: current.id,
          platformId: input.platformId,
          externalUserId: input.externalUserId,
          displayName: input.displayName ?? null,
        })
        .returning();

      if (row === undefined) {
        throw new InternalServerError("tournament participant insert returned no row");
      }
      return toParticipantView(row);
    },

    async withdraw(
      scope: Scope,
      tournamentId: string,
      target: WithdrawTarget,
    ): Promise<void> {
      const current = await readRow(scope, tournamentId);

      if (current.status === "completed" || current.status === "cancelled") {
        throw new ConflictError("a finished tournament cannot be withdrawn from");
      }

      const identity =
        "participantId" in target
          ? eq(tournamentParticipant.id, target.participantId)
          : and(
              eq(tournamentParticipant.platformId, target.platformId),
              eq(tournamentParticipant.externalUserId, target.externalUserId),
            );

      const withdrawn = await db
        .update(tournamentParticipant)
        .set({ status: "withdrawn", withdrawnAt: new Date() })
        .where(and(eq(tournamentParticipant.tournamentId, current.id), identity))
        .returning({
          id: tournamentParticipant.id,
          platformId: tournamentParticipant.platformId,
          externalUserId: tournamentParticipant.externalUserId,
        });

      const seat = withdrawn[0];
      if (seat === undefined) throw new NotFoundError("registration not found");

      if (current.status !== "running") return;

      const seats = await db
        .select({ id: matchParticipant.id, matchId: matchParticipant.matchId })
        .from(matchParticipant)
        .innerJoin(match, eq(matchParticipant.matchId, match.id))
        .where(
          and(
            eq(match.tournamentId, current.id),
            inArray(match.status, ["pending", "active"]),
            eq(matchParticipant.platformId, seat.platformId),
            eq(matchParticipant.externalUserId, seat.externalUserId),
          ),
        );

      if (seats.length === 0) return;

      await db
        .update(matchParticipant)
        .set({ outcome: "disqualified", placement: null, updatedAt: new Date() })
        .where(
          inArray(
            matchParticipant.id,
            seats.map((row) => row.id),
          ),
        );

      for (const matchId of new Set(seats.map((row) => row.matchId))) {
        const [currentMatch] = await db
          .select()
          .from(match)
          .where(eq(match.id, matchId))
          .limit(1);

        if (currentMatch === undefined) continue;

        const participants = await db
          .select()
          .from(matchParticipant)
          .where(eq(matchParticipant.matchId, matchId));

        const remaining = participants.filter(
          (row) => row.outcome !== "disqualified",
        );

        if (remaining.length !== 1) continue;

        const winner = remaining[0];
        if (winner === undefined || winner.outcome !== "pending") continue;

        await settleMatch(db, currentMatch, {
          winnerId: winner.id,
          outcomes: [
            { participantId: winner.id, outcome: "won", placement: 1 },
          ],
        });
      }
    },

    async listParticipants(
      scope: Scope,
      tournamentId: string,
    ): Promise<ParticipantView[]> {
      await readRow(scope, tournamentId);

      const rows = await db
        .select()
        .from(tournamentParticipant)
        .where(eq(tournamentParticipant.tournamentId, tournamentId))
        .orderBy(
          asc(tournamentParticipant.seed),
          asc(tournamentParticipant.registeredAt),
        );

      return rows.map(toParticipantView);
    },
  };
}
