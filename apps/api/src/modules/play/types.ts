import type { CreateGameSessionBody, SubmitScoreBody } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import type { gameSession, gameSessionScore } from "@wasanni/db/schema";
import type { Enqueuer } from "@wasanni/jobs";
import type {
  ObjectStorage,
  SessionEvent,
  SessionEventStore,
} from "@wasanni/kit";
import type { WebhookDispatcher } from "../webhook/types.ts";
import type { MatchRecorder } from "../competition/types.ts";
import type { createLeaderboardService } from "./leaderboard.service.ts";
import type { createReplayService } from "./replay.service.ts";
import type { createScoreService } from "./score.service.ts";
import type { createSessionService } from "./session.service.ts";

export type GameSessionRow = (typeof gameSession.$inferSelect);

export type ScoreRow = (typeof gameSessionScore.$inferSelect);

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

export type ReplaySource = "redis" | "r2";

export type ReplayView = {
  source: ReplaySource;
  events: SessionEvent[];
};

export type SessionServiceDeps = {
  dispatcher: WebhookDispatcher;
  enqueuer: Enqueuer | null;
  realtimeBaseUrl: string;
};

export type ScoreServiceDeps = {
  dispatcher: WebhookDispatcher;
  sessions: SessionService;
  matchRecorder?: MatchRecorder;
};

export type SessionService = ReturnType<typeof createSessionService>;

export type ScoreService = ReturnType<typeof createScoreService>;

export type LeaderboardService = ReturnType<typeof createLeaderboardService>;

export type ReplayService = ReturnType<typeof createReplayService>;

export type PlayDeps = {
  db: Db;
  storage: ObjectStorage;
  events: SessionEventStore;
  dispatcher: WebhookDispatcher;
  enqueuer: Enqueuer | null;
  realtimeBaseUrl: string;
  matchRecorder?: MatchRecorder;
};

export type SessionRouteDeps = {
  service: SessionService;
};

export type ScoreRouteDeps = {
  service: ScoreService;
};

export type LeaderboardRouteDeps = {
  service: LeaderboardService;
};

export type ReplayRouteDeps = {
  service: ReplayService;
};
