import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameSession, joinCode, platform } from "@wasanni/db/schema";
import { NotFoundError, sha256Hex } from "@wasanni/kit";
import { REALTIME_PATH, type JoinResolveView } from "@wasanni/contracts";

export type JoinServiceDeps = {
  apiBaseUrl: string;
  realtimeBaseUrl: string;
};

export type JoinService = ReturnType<typeof createJoinService>;

export function createJoinService(db: Db, deps: JoinServiceDeps) {
  return {
    async resolve(code: string): Promise<JoinResolveView> {
      if (!/^[A-Za-z0-9]{10}$/.test(code)) throw new NotFoundError("join code not found");

      const [found] = await db
        .select({
          sessionId: gameSession.id,
          platformSlug: platform.slug,
          gameSlug: game.slug,
          tournamentId: gameSession.tournamentId,
          matchId: gameSession.matchId,
          externalUserId: gameSession.externalUserId,
          externalName: gameSession.externalName,
          expiresAt: joinCode.expiresAt,
        })
        .from(joinCode)
        .innerJoin(gameSession, eq(gameSession.id, joinCode.sessionId))
        .innerJoin(platform, eq(platform.id, joinCode.platformId))
        .innerJoin(game, eq(game.id, joinCode.gameId))
        .where(
          and(
            eq(joinCode.codeHash, sha256Hex(code)),
            gt(joinCode.expiresAt, new Date()),
            eq(gameSession.status, "active"),
          ),
        )
        .limit(1);

      if (found === undefined) throw new NotFoundError("join code not found");

      const apiBase = deps.apiBaseUrl.replace(/\/+$/, "");
      const realtimeBase = deps.realtimeBaseUrl.replace(/\/+$/, "");

      return {
        playUrl: `${apiBase}/s/${found.platformSlug}/${found.gameSlug}/?sessionId=${found.sessionId}&code=${code}`,
        realtimeUrl: `${realtimeBase}${REALTIME_PATH}/${found.sessionId}?token=${code}`,
        sessionId: found.sessionId,
        platformSlug: found.platformSlug,
        gameSlug: found.gameSlug,
        tournamentId: found.tournamentId,
        matchId: found.matchId,
        externalUserId: found.externalUserId,
        externalName: found.externalName,
        expiresAt: found.expiresAt.toISOString(),
      };
    },
  };
}
