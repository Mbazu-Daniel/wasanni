import type { Db } from "@wasanni/db";
import type { Enqueuer } from "@wasanni/jobs";
import type { ObjectStorage, SessionEventStore } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { WebhookDispatcher } from "../webhook/webhook-dispatcher.ts";
import { createLeaderboardRoutes } from "./leaderboard.routes.ts";
import { createLeaderboardService } from "./leaderboard.service.ts";
import { createReplayRoutes } from "./replay.routes.ts";
import { createReplayService } from "./replay.service.ts";
import { createScoreRoutes } from "./score.routes.ts";
import { createScoreService } from "./score.service.ts";
import { createSessionRoutes } from "./session.routes.ts";
import { createSessionService } from "./session.service.ts";

export type PlayDeps = {
  db: Db;
  storage: ObjectStorage;
  events: SessionEventStore;
  dispatcher: WebhookDispatcher;
  enqueuer: Enqueuer | null;
  realtimeBaseUrl: string;
};

export const createPlayRoutes = <T extends PrincipalApi>(api: T, deps: PlayDeps) => {
  const sessions = createSessionService(deps.db, {
    dispatcher: deps.dispatcher,
    enqueuer: deps.enqueuer,
    realtimeBaseUrl: deps.realtimeBaseUrl,
  });
  const scores = createScoreService(deps.db, {
    dispatcher: deps.dispatcher,
    sessions,
  });
  const leaderboard = createLeaderboardService(deps.db);
  const replay = createReplayService(deps.db, deps.storage, deps.events);

  createSessionRoutes(api, { service: sessions });
  createScoreRoutes(api, { service: scores });
  createLeaderboardRoutes(api, { service: leaderboard });
  createReplayRoutes(api, { service: replay });

  return api;
};
