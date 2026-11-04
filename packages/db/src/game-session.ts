import { and, eq, gt, or } from "drizzle-orm";
import type { Db, GameSessionCredential } from "./types.ts";
import { gameSession } from "./schema/play/game-session.ts";
import { joinCode } from "./schema/play/join-code.ts";

export async function readGameSessionByToken(
  db: Db,
  tokenHash: string,
): Promise<GameSessionCredential | null> {
  const [row] = await db
    .select({
      id: gameSession.id,
      organizationId: gameSession.organizationId,
      platformId: gameSession.platformId,
      gameId: gameSession.gameId,
      externalUserId: gameSession.externalUserId,
      mode: gameSession.mode,
      status: gameSession.status,
      expiresAt: gameSession.expiresAt,
    })
    .from(gameSession)
    .leftJoin(joinCode, eq(joinCode.sessionId, gameSession.id))
    .where(
      or(
        eq(gameSession.tokenHash, tokenHash),
        and(eq(joinCode.codeHash, tokenHash), gt(joinCode.expiresAt, new Date())),
      ),
    )
    .limit(1);

  return row ?? null;
}
