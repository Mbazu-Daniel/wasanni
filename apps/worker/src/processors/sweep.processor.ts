import { and, eq, lt } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSession, session, verification } from "@wasanni/db/schema";

export type SweepResult = {
  expiredSessions: number;
  purgedAuthSessions: number;
  purgedVerifications: number;
};

export function createSweepProcessor(db: Db) {
  return async function sweep(): Promise<SweepResult> {
    const now = new Date();

    const expired = await db
      .update(gameSession)
      .set({ status: "expired" })
      .where(and(eq(gameSession.status, "active"), lt(gameSession.expiresAt, now)))
      .returning({ id: gameSession.id });

    const purgedSessions = await db
      .delete(session)
      .where(lt(session.expiresAt, now))
      .returning({ id: session.id });

    const purgedVerifications = await db
      .delete(verification)
      .where(lt(verification.expiresAt, now))
      .returning({ id: verification.id });

    return {
      expiredSessions: expired.length,
      purgedAuthSessions: purgedSessions.length,
      purgedVerifications: purgedVerifications.length,
    };
  };
}
