import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSession, gameSessionScore } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import type { GameLeaderboardQuery, LeaderboardList } from "@wasanni/contracts";

const DEFAULT_LIMIT = 50;

type Cursor = { score: number; submittedAt: Date; id: string };

const encodeCursor = (row: Cursor): string =>
  Buffer.from(`${row.score}|${row.submittedAt.toISOString()}|${row.id}`, "utf8").toString(
    "base64url",
  );

const decodeCursor = (cursor: string): Cursor | null => {
  const [score, submittedAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");

  if (score === undefined || submittedAt === undefined || id === undefined) return null;

  const parsed = new Date(submittedAt);
  const numeric = Number(score);

  if (Number.isNaN(parsed.getTime()) || Number.isNaN(numeric)) return null;

  return { score: numeric, submittedAt: parsed, id };
};

export function createLeaderboardService(db: Db) {
  return {
    async list(scope: Scope, gameId: string, query: GameLeaderboardQuery): Promise<LeaderboardList> {
      const limit = query.limit ?? DEFAULT_LIMIT;
      const cursor = query.cursor === undefined ? null : decodeCursor(query.cursor);

      const bestPerPlayer = db
        .select({
          id: gameSessionScore.id,
          platformId: gameSessionScore.platformId,
          sessionId: gameSessionScore.sessionId,
          externalUserId: gameSessionScore.externalUserId,
          externalName: gameSession.externalName,
          score: gameSessionScore.score,
          flagged: gameSessionScore.flagged,
          submittedAt: gameSessionScore.submittedAt,
          playerPlace: sql<number>`row_number() over (partition by ${gameSessionScore.externalUserId} order by ${gameSessionScore.score} desc, ${gameSessionScore.submittedAt} asc, ${gameSessionScore.id} asc)`.as(
            "player_place",
          ),
        })
        .from(gameSessionScore)
        .innerJoin(gameSession, eq(gameSessionScore.sessionId, gameSession.id))
        .where(
          scopeTo(
            scope,
            gameSessionScore,
            eq(gameSessionScore.gameId, gameId),
            query.platformId === undefined
              ? undefined
              : eq(gameSessionScore.platformId, query.platformId),
            eq(gameSessionScore.status, "accepted"),
            query.mode === undefined ? undefined : eq(gameSessionScore.mode, query.mode),
            query.includeFlagged === true
              ? undefined
              : eq(gameSessionScore.flagged, false),
          ),
        )
        .as("best_per_player");

      const rankedTable = db
        .select({
          id: bestPerPlayer.id,
          platformId: bestPerPlayer.platformId,
          sessionId: bestPerPlayer.sessionId,
          externalUserId: bestPerPlayer.externalUserId,
          externalName: bestPerPlayer.externalName,
          score: bestPerPlayer.score,
          flagged: bestPerPlayer.flagged,
          submittedAt: bestPerPlayer.submittedAt,
          rank: sql<number>`(row_number() over (order by ${bestPerPlayer.score} desc, ${bestPerPlayer.submittedAt} asc, ${bestPerPlayer.id} asc))::int`.as(
            "rank",
          ),
        })
        .from(bestPerPlayer)
        .where(eq(bestPerPlayer.playerPlace, 1))
        .as("ranked");

      const projection = db
        .select({
          id: rankedTable.id,
          platformId: rankedTable.platformId,
          sessionId: rankedTable.sessionId,
          externalUserId: rankedTable.externalUserId,
          externalName: rankedTable.externalName,
          score: rankedTable.score,
          flagged: rankedTable.flagged,
          submittedAt: rankedTable.submittedAt,
          rank: rankedTable.rank,
        })
        .from(rankedTable);

      const ordered =
        cursor === null
          ? projection
          : projection.where(
              or(
                lt(rankedTable.score, cursor.score),
                and(
                  eq(rankedTable.score, cursor.score),
                  gt(rankedTable.submittedAt, cursor.submittedAt),
                ),
                and(
                  eq(rankedTable.score, cursor.score),
                  eq(rankedTable.submittedAt, cursor.submittedAt),
                  gt(rankedTable.id, cursor.id),
                ),
              ),
            );

      const rows = await ordered
        .orderBy(
          desc(rankedTable.score),
          asc(rankedTable.submittedAt),
          asc(rankedTable.id),
        )
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const last = items.at(-1);

      return {
        entries: items.map((row) => ({
          rank: row.rank,
          platformId: row.platformId,
          sessionId: row.sessionId,
          externalUserId: row.externalUserId,
          externalName: row.externalName,
          score: row.score,
          flagged: row.flagged,
          submittedAt: row.submittedAt.toISOString(),
        })),
        page: {
          limit,
          hasMore,
          cursor: hasMore && last !== undefined ? encodeCursor(last) : null,
        },
      };
    },
  };
}
