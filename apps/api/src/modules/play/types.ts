import type { CreateGameSessionBody, SubmitScoreBody } from "@wasanni/contracts";
import type { gameSession } from "@wasanni/db/schema";

export type GameSessionRow = (typeof gameSession.$inferSelect);

export type SessionCreateInput = {
  platformId: string;
  body: CreateGameSessionBody;
};

export type ScoreSubmitInput = {
  platformId: string;
  sessionId: string;
  body: SubmitScoreBody;
};

export type HidePlayerScoresInput = {
  platformId: string;
  externalUserId: string;
  gameId?: string;
};
