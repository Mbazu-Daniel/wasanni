import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameFile, gameSession, joinCode, platform, tournament } from "@wasanni/db/schema";
import { NotFoundError, sha256Hex, type ObjectStorage } from "@wasanni/kit";
import { REALTIME_PATH, type JoinResolveView } from "@wasanni/contracts";
import { gamePlayUrl, type PlayUrlFile } from "./play-url.ts";

export type JoinServiceDeps = {
  storage: ObjectStorage;
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
          gameFileId: gameSession.gameFileId,
          tournamentId: gameSession.tournamentId,
          matchId: gameSession.matchId,
          externalUserId: gameSession.externalUserId,
          externalName: gameSession.externalName,
          gameSeed: tournament.gameSeed,
          expiresAt: joinCode.expiresAt,
        })
        .from(joinCode)
        .innerJoin(gameSession, eq(gameSession.id, joinCode.sessionId))
        .innerJoin(platform, eq(platform.id, joinCode.platformId))
        .innerJoin(game, eq(game.id, joinCode.gameId))
        .leftJoin(tournament, eq(tournament.id, gameSession.tournamentId))
        .where(
          and(
            eq(joinCode.codeHash, sha256Hex(code)),
            gt(joinCode.expiresAt, new Date()),
            eq(gameSession.status, "active"),
          ),
        )
        .limit(1);

      if (found === undefined) throw new NotFoundError("join code not found");

      let file: PlayUrlFile = null;
      if (found.gameFileId !== null) {
        const [build] = await db
          .select({
            kind: gameFile.kind,
            objectKey: gameFile.objectKey,
            entryPoint: gameFile.entryPoint,
            servedPrefix: gameFile.servedPrefix,
          })
          .from(gameFile)
          .where(eq(gameFile.id, found.gameFileId))
          .limit(1);
        if (build !== undefined) file = build;
      }

      const realtimeBase = deps.realtimeBaseUrl.replace(/\/+$/, "");

      return {
        playUrl: gamePlayUrl({
          storage: deps.storage,
          apiBaseUrl: deps.apiBaseUrl,
          platformSlug: found.platformSlug,
          gameSlug: found.gameSlug,
          file,
          tournamentId: found.tournamentId,
          matchId: found.matchId,
          externalUserId: found.externalUserId,
          code,
        }),
        realtimeUrl: `${realtimeBase}${REALTIME_PATH}/${found.sessionId}?token=${code}`,
        sessionId: found.sessionId,
        platformSlug: found.platformSlug,
        gameSlug: found.gameSlug,
        gameSeed: found.gameSeed,
        tournamentId: found.tournamentId,
        matchId: found.matchId,
        externalUserId: found.externalUserId,
        externalName: found.externalName,
        expiresAt: found.expiresAt.toISOString(),
      };
    },
  };
}
