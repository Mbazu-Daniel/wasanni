import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import {
  match,
  matchParticipant,
} from "@wasanni/db/schema";
import type { Scope } from "@wasanni/kit";
import {
  ConflictError,
  InternalServerError,
  newId,
} from "@wasanni/kit";
import type {
  DuelEnterBody,
  DuelEnterView,
  TournamentEnterBody,
  TournamentEnterView,
} from "@wasanni/contracts";
import type { SessionService } from "../play/types.ts";
import type { ParticipantsService, TournamentService } from "./types.ts";

const DUEL_PAIRING_WINDOW_MS = 5 * 60 * 1000;

type EnterDeps = {
  sessions: SessionService;
  participants: ParticipantsService;
  tournaments: TournamentService;
};

type SeatRow = {
  id: string;
  matchId: string;
  slot: number;
  platformId: string;
  externalUserId: string;
};

const seatColumns = {
  id: matchParticipant.id,
  matchId: matchParticipant.matchId,
  slot: matchParticipant.slot,
  platformId: matchParticipant.platformId,
  externalUserId: matchParticipant.externalUserId,
};

const otherSeat = (
  seats: SeatRow[],
  platformId: string,
  externalUserId: string,
): SeatRow | undefined =>
  seats.find(
    (seat) =>
      seat.platformId !== platformId || seat.externalUserId !== externalUserId,
  );

export function createEnterService(db: Db, deps: EnterDeps) {
  const seatRows = async (matchIds: string[]): Promise<SeatRow[]> =>
    matchIds.length === 0
      ? []
      : await db
          .select(seatColumns)
          .from(matchParticipant)
          .where(inArray(matchParticipant.matchId, matchIds));

  const createSeat = async (
    matchId: string,
    slot: number,
    platformId: string,
    externalUserId: string,
    displayName: string | null,
  ): Promise<SeatRow> => {
    const [row] = await db
      .insert(matchParticipant)
      .values({
        id: newId(),
        matchId,
        slot,
        platformId,
        externalUserId,
        displayName,
      })
      .returning(seatColumns);

    if (row === undefined) {
      throw new InternalServerError("match participant insert returned no row");
    }
    return row;
  };

  const playDuel = async (
    scope: Scope,
    input: DuelEnterBody,
    matchRow: typeof match.$inferSelect,
    seat: SeatRow,
    opponentId: string | null,
  ): Promise<DuelEnterView> => {
    const created = await deps.sessions.create(scope, {
      platformId: input.platformId,
      body: {
        gameId: input.gameId,
        externalUserId: input.externalUserId,
        ...(input.externalName === undefined
          ? {}
          : { externalName: input.externalName }),
        ...(input.configId === undefined ? {} : { configId: input.configId }),
        matchId: matchRow.id,
      },
    });

    await db
      .update(matchParticipant)
      .set({ sessionId: created.session.id, updatedAt: new Date() })
      .where(eq(matchParticipant.id, seat.id));

    return {
      matchId: matchRow.id,
      opponent: opponentId,
      session: created.session,
      sessionToken: created.sessionToken,
      realtimeUrl: created.realtimeUrl,
      joinCode: created.joinCode,
      playUrl: created.playUrl,
    };
  };

  const enterDuel = async (
    scope: Scope,
    input: DuelEnterBody,
  ): Promise<DuelEnterView> => {
    const windowStart = new Date(Date.now() - DUEL_PAIRING_WINDOW_MS);

    const [own] = await db
      .select({ ...seatColumns, matchRow: match })
      .from(matchParticipant)
      .innerJoin(match, eq(match.id, matchParticipant.matchId))
      .where(
        scopeTo(
          scope,
          match,
          eq(match.gameId, input.gameId),
          isNull(match.tournamentId),
          inArray(match.status, ["pending", "active"]),
          gt(match.createdAt, windowStart),
          eq(matchParticipant.platformId, input.platformId),
          eq(matchParticipant.externalUserId, input.externalUserId),
        ),
      )
      .orderBy(desc(match.createdAt))
      .limit(1);

    if (own !== undefined) {
      const seats = await seatRows([own.matchRow.id]);
      const rival = otherSeat(seats, input.platformId, input.externalUserId);
      return playDuel(scope, input, own.matchRow, own, rival?.externalUserId ?? null);
    }

    const openMatches = await db
      .select()
      .from(match)
      .where(
        scopeTo(
          scope,
          match,
          eq(match.gameId, input.gameId),
          isNull(match.tournamentId),
          eq(match.status, "pending"),
          gt(match.createdAt, windowStart),
        ),
      )
      .orderBy(match.createdAt)
      .limit(20);

    const seatsByMatch = new Map<string, SeatRow[]>();
    for (const seat of await seatRows(openMatches.map((row) => row.id))) {
      const bucket = seatsByMatch.get(seat.matchId) ?? [];
      bucket.push(seat);
      seatsByMatch.set(seat.matchId, bucket);
    }

    const partner = openMatches.find((row) => {
      const seats = seatsByMatch.get(row.id) ?? [];
      return (
        seats.length === 1 &&
        (seats[0]?.platformId !== input.platformId ||
          seats[0]?.externalUserId !== input.externalUserId)
      );
    });

    if (partner !== undefined) {
      const rival = (seatsByMatch.get(partner.id) ?? [])[0];
      if (rival === undefined) {
        throw new InternalServerError("duel partner seat vanished");
      }

      let seat: SeatRow;
      try {
        seat = await createSeat(
          partner.id,
          rival.slot === 1 ? 2 : 1,
          input.platformId,
          input.externalUserId,
          input.externalName ?? null,
        );
      } catch {
        throw new ConflictError("the pairing just changed, enter again");
      }

      await db
        .update(match)
        .set({ status: "active", startedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(match.id, partner.id),
            eq(match.status, "pending"),
          ),
        );

      return playDuel(scope, input, partner, seat, rival.externalUserId);
    }

    if (openMatches.length > 0) {
      throw new ConflictError("pairing is busy, enter again");
    }

    const [fresh] = await db
      .insert(match)
      .values({
        id: newId(),
        organizationId: scope.organizationId,
        gameId: input.gameId,
        tournamentId: null,
        status: "pending",
      })
      .returning();

    if (fresh === undefined) {
      throw new InternalServerError("match insert returned no row");
    }

    const seat = await createSeat(
      fresh.id,
      1,
      input.platformId,
      input.externalUserId,
      input.externalName ?? null,
    );

    return playDuel(scope, input, fresh, seat, null);
  };

  const enterTournament = async (
    scope: Scope,
    tournamentId: string,
    input: TournamentEnterBody,
  ): Promise<TournamentEnterView> => {
    const current = await deps.tournaments.get(scope, tournamentId);

    await deps.participants.register(scope, {
      tournamentId,
      platformId: input.platformId,
      externalUserId: input.externalUserId,
      ...(input.displayName === undefined
        ? {}
        : { displayName: input.displayName }),
    });

    const sessionBody = {
      gameId: current.gameId,
      externalUserId: input.externalUserId,
      ...(input.displayName === undefined
        ? {}
        : { externalName: input.displayName }),
      tournamentId,
    };

    if (current.format !== "bracket" || current.status === "open") {
      const created = await deps.sessions.create(scope, {
        platformId: input.platformId,
        body: sessionBody,
      });
      return {
        session: created.session,
        sessionToken: created.sessionToken,
        realtimeUrl: created.realtimeUrl,
        joinCode: created.joinCode,
        playUrl: created.playUrl,
      };
    }

    const [seated] = await db
      .select({ matchRow: match })
      .from(matchParticipant)
      .innerJoin(match, eq(match.id, matchParticipant.matchId))
      .where(
        scopeTo(
          scope,
          match,
          eq(match.tournamentId, tournamentId),
          inArray(match.status, ["pending", "active"]),
          eq(matchParticipant.platformId, input.platformId),
          eq(matchParticipant.externalUserId, input.externalUserId),
        ),
      )
      .orderBy(desc(match.bracketRound), match.bracketSlot)
      .limit(1);

    if (seated === undefined) {
      throw new ConflictError("no open match seats this player yet");
    }

    const seats = await seatRows([seated.matchRow.id]);
    const rival = otherSeat(seats, input.platformId, input.externalUserId);

    const created = await deps.sessions.create(scope, {
      platformId: input.platformId,
      body: { ...sessionBody, matchId: seated.matchRow.id },
    });

    return {
      session: created.session,
      sessionToken: created.sessionToken,
      realtimeUrl: created.realtimeUrl,
      joinCode: created.joinCode,
      playUrl: created.playUrl,
      matchId: seated.matchRow.id,
      opponent: rival?.externalUserId ?? null,
    };
  };

  return { enterDuel, enterTournament };
}

export type EnterService = ReturnType<typeof createEnterService>;
