import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSessionScore } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { notFound, type ObjectStorage, type SessionEvent, type SessionEventStore } from "@wasanni/kit";
import type { ReplayView } from "./types.ts";

export function createReplayService(
  db: Db,
  storage: ObjectStorage,
  events: SessionEventStore,
) {
  return {
    async getSessionEvents(
      scope: Scope,
      platformId: string,
      sessionId: string,
    ): Promise<ReplayView> {
      const [score] = await db
        .select({
          archiveKey: gameSessionScore.archiveKey,
          archiveOffset: gameSessionScore.archiveOffset,
          archiveLength: gameSessionScore.archiveLength,
        })
        .from(gameSessionScore)
        .where(
          scopeTo(
            scope,
            gameSessionScore,
            eq(gameSessionScore.sessionId, sessionId),
            eq(gameSessionScore.platformId, platformId),
          ),
        )
        .limit(1);

      if (score === undefined) throw notFound("score not found");

      if (score.archiveKey === null) {
        return { source: "redis", events: await events.readAll(sessionId) };
      }

      const length = score.archiveLength ?? 0;
      if (length === 0) return { source: "r2", events: [] };

      const bytes = await storage.getObjectRange({
        key: score.archiveKey,
        offset: score.archiveOffset ?? 0,
        length,
      });

      const text = new TextDecoder().decode(Bun.zstdDecompressSync(bytes));

      return {
        source: "r2",
        events: text
          .split("\n")
          .filter((line) => line.length > 0)
          .map((line) => JSON.parse(line) as SessionEvent),
      };
    },
  };
}
