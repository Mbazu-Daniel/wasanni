import { asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSessionScore } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import type { LeaderboardEntry, LeaderboardQuery } from "@wasanni/contracts";

const DEFAULT_LIMIT = 50;

export function createLeaderboardService(db: Db) {
  return {
    async list(
      scope: Scope,
      platformId: string,
      query: LeaderboardQuery,
    ): Promise<LeaderboardEntry[]> {
      const limit = query.limit ?? DEFAULT_LIMIT;
      const offset = query.offset ?? 0;

      const ranked = db
        .select({
          id: gameSessionScore.id,
          sessionId: gameSessionScore.sessionId,
          externalUserId: gameSessionScore.externalUserId,
          score: gameSessionScore.score,
          flagged: gameSessionScore.flagged,
          submittedAt: gameSessionScore.submittedAt,
          playerPlace: sql<number>`row_number() over (partition by ${gameSessionScore.externalUserId} order by ${gameSessionScore.score} desc, ${gameSessionScore.submittedAt} asc, ${gameSessionScore.id} asc)`.as(
            "player_place",
          ),
        })
        .from(gameSessionScore)
        .where(
          scopeTo(
            scope,
            gameSessionScore,
            eq(gameSessionScore.gameId, query.gameId),
            eq(gameSessionScore.platformId, platformId),
            eq(gameSessionScore.status, "accepted"),
            query.mode === undefined ? undefined : eq(gameSessionScore.mode, query.mode),
            query.includeFlagged === true ? undefined : eq(gameSessionScore.flagged, false),
          ),
        )
        .as("ranked");

      const rows = await db
        .select({
          sessionId: ranked.sessionId,
          externalUserId: ranked.externalUserId,
          score: ranked.score,
          flagged: ranked.flagged,
          submittedAt: ranked.submittedAt,
        })
        .from(ranked)
        .where(eq(ranked.playerPlace, 1))
        .orderBy(desc(ranked.score), asc(ranked.submittedAt), asc(ranked.id))
        .limit(limit)
        .offset(offset);

      return rows.map((row, index) => ({
        rank: offset + index + 1,
        sessionId: row.sessionId,
        externalUserId: row.externalUserId,
        score: row.score,
        flagged: row.flagged,
        submittedAt: row.submittedAt.toISOString(),
      }));
    },
  };
}
