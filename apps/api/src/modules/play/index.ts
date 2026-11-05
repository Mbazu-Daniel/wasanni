import type { PrincipalApi } from "../../plugins/types.ts";
import { createLeaderboardRoutes } from "./leaderboard.routes.ts";
import { createLeaderboardService } from "./leaderboard.service.ts";
import { createJoinRoutes } from "./join.routes.ts";
import { createJoinService } from "./join.service.ts";
import { createPlayTestRoutes } from "./playtest.routes.ts";
import { createPlayTestService } from "./playtest.service.ts";
import { createReplayRoutes } from "./replay.routes.ts";
import { createReplayService } from "./replay.service.ts";
import { createScoreRoutes } from "./score.routes.ts";
import { createScoreService } from "./score.service.ts";
import { createSessionRoutes } from "./session.routes.ts";
import { createSessionService } from "./session.service.ts";
import type { PlayDeps, PlayRouteDeps, PlayServices } from "./types.ts";

export const createPlayServices = (deps: PlayDeps): PlayServices => {
  const joins = createJoinService(deps.db, {
    storage: deps.storage,
    apiBaseUrl: deps.apiBaseUrl,
    realtimeBaseUrl: deps.realtimeBaseUrl,
  });
  const sessions = createSessionService(deps.db, {
    dispatcher: deps.dispatcher,
    enqueuer: deps.enqueuer,
    storage: deps.storage,
    apiBaseUrl: deps.apiBaseUrl,
    realtimeBaseUrl: deps.realtimeBaseUrl,
    verifier: deps.verifier,
    usage: deps.usage,
    encryptionKey: deps.encryptionKey,
  });
  const scores = createScoreService(deps.db, {
    dispatcher: deps.dispatcher,
    sessions,
    verifier: deps.verifier,
    usage: deps.usage,
    encryptionKey: deps.encryptionKey,
    ...(deps.matchRecorder === undefined
      ? {}
      : { matchRecorder: deps.matchRecorder }),
  });
  const leaderboards = createLeaderboardService(deps.db);
  const playTests = createPlayTestService(deps.db, sessions);
  const replay = createReplayService(deps.db, deps.storage, deps.events);

  return { sessions, scores, leaderboards, joins, playTests, replay };
};

export const createPlayRoutes = <T extends PrincipalApi>(api: T, deps: PlayRouteDeps) => {
  const { sessions, scores, leaderboards, joins, playTests, replay } = deps.services;
  const rateLimit = deps.rateLimit ?? {};

  createSessionRoutes(api, { service: sessions, ...rateLimit });
  createScoreRoutes(api, { service: scores, ...rateLimit });
  createLeaderboardRoutes(api, { service: leaderboards, ...rateLimit });
  createJoinRoutes(api, { service: joins, ...rateLimit });
  createPlayTestRoutes(api, { service: playTests, ...rateLimit });
  createReplayRoutes(api, { service: replay });

  return api;
};
