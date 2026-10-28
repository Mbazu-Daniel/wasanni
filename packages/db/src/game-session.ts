import { eq } from "drizzle-orm";
import type { GameSessionStatus } from "@wasanni/contracts";
import type { Db } from "./client.ts";
import { gameSession } from "./schema/play/game-session.ts";

export type GameSessionCredential = {
  id: string;
  organizationId: string;
  platformId: string;
  gameId: string;
  externalUserId: string;
  mode: string | null;
  status: GameSessionStatus;
  expiresAt: Date;
};

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
