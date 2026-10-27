import type { Db } from "@wasanni/db";
import { readGameSessionByToken } from "@wasanni/db";
import { forbidden, sha256Hex, unauthenticated } from "@wasanni/kit";
import type { RealtimeSession } from "./types.ts";

const readToken = (request: Request): string => {
  const fromQuery = new URL(request.url).searchParams.get("token");
  if (fromQuery !== null && fromQuery !== "") return fromQuery;

  const header = request.headers.get("authorization");
  if (header === null) return "";

  return header.replace(/^Bearer\s+/i, "").trim();
};

export async function resolveRealtimeSession(
  db: Db,
  sessionId: string,
  request: Request,
): Promise<RealtimeSession> {
  const token = readToken(request);

  if (token === "") throw unauthenticated("a session token is required");

  const session = await readGameSessionByToken(db, sha256Hex(token));
  if (session === null) throw unauthenticated("the session token is not valid");
  if (session.id !== sessionId) throw forbidden("the session token belongs to another session");
  if (session.status === "ended") throw forbidden("the game session has ended");
  if (session.status === "expired") throw forbidden("the game session has expired");
  if (session.expiresAt.getTime() <= Date.now()) {
    throw forbidden("the game session has expired");
  }

  return {
    sessionId: session.id,
    token,
    organizationId: session.organizationId,
    platformId: session.platformId,
    gameId: session.gameId,
    externalUserId: session.externalUserId,
  };
}
