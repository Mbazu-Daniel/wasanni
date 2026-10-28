import { eq } from "drizzle-orm";
import type { Db, GameSessionCredential } from "./types.ts";
import { gameSession } from "./schema/play/game-session.ts";

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
    .where(eq(gameSession.tokenHash, tokenHash))
    .limit(1);

  return row ?? null;
}
