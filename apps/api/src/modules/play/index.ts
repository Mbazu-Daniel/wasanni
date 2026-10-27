import type { PrincipalApi } from "../../plugins/types.ts";
import { createLeaderboardRoutes } from "./leaderboard.routes.ts";
import { createLeaderboardService } from "./leaderboard.service.ts";
import { createReplayRoutes } from "./replay.routes.ts";
import { createReplayService } from "./replay.service.ts";
import { createScoreRoutes } from "./score.routes.ts";
import { createScoreService } from "./score.service.ts";
import { createSessionRoutes } from "./session.routes.ts";
import { createSessionService } from "./session.service.ts";
import type { PlayDeps } from "./types.ts";

export const createPlayRoutes = <T extends PrincipalApi>(api: T, deps: PlayDeps) => {
  const sessions = createSessionService(deps.db, {
    dispatcher: deps.dispatcher,
    enqueuer: deps.enqueuer,
    realtimeBaseUrl: deps.realtimeBaseUrl,
  });
  const scores = createScoreService(deps.db, {
    dispatcher: deps.dispatcher,
    sessions,
    ...(deps.matchRecorder === undefined
      ? {}
      : { matchRecorder: deps.matchRecorder }),
  });
  const leaderboard = createLeaderboardService(deps.db);
  const replay = createReplayService(deps.db, deps.storage, deps.events);

  createSessionRoutes(api, { service: sessions });
  createScoreRoutes(api, { service: scores });
  createLeaderboardRoutes(api, { service: leaderboard });
  createReplayRoutes(api, { service: replay });

  return api;
};
