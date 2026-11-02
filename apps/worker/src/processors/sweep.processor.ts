import { and, eq, lt } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSession, session, tournament, verification } from "@wasanni/db/schema";
import type { SweepResult } from "../types.ts";

export function createSweepProcessor(db: Db) {
  return async function sweep(): Promise<SweepResult> {
    const now = new Date();

    const expired = await db
      .update(gameSession)
      .set({ status: "expired" })
      .where(and(eq(gameSession.status, "active"), lt(gameSession.expiresAt, now)))
      .returning({ id: gameSession.id, organizationId: gameSession.organizationId });

    const purgedSessions = await db
      .delete(session)
      .where(lt(session.expiresAt, now))
      .returning({ id: session.id });

    const purgedVerifications = await db
      .delete(verification)
      .where(lt(verification.expiresAt, now))
      .returning({ id: verification.id });

    const opened = await db
      .update(tournament)
      .set({ status: "open", updatedAt: now })
      .where(
        and(eq(tournament.status, "scheduled"), lt(tournament.startsAt, now)),
      )
      .returning({ id: tournament.id });

    return {
      expiredSessions: expired.length,
      openedTournaments: opened.length,
      expiredOrganizations: [...new Set(expired.map((row) => row.organizationId))],
      purgedAuthSessions: purgedSessions.length,
      purgedVerifications: purgedVerifications.length,
    };
  };
}
