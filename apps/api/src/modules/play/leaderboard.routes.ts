import {
  GameLeaderboardParams,
  GameLeaderboardQuery,
  LeaderboardList,
  PERMISSION,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { LeaderboardRouteDeps } from "./types.ts";

export const createLeaderboardRoutes = <T extends PrincipalApi>(
  api: T,
  { service, rateLimit }: LeaderboardRouteDeps,
) =>
  api.get(
    "/api/v1/games/:gameId/leaderboards",
    async ({ principal, params, query }) => ({
      entries: await service.list(
        organizationScope(principal),
        principal.platformId,
        params.gameId,
        query,
      ),
    }),
    {
      platformAuth: PERMISSION.scoreRead,
      params: GameLeaderboardParams,
      query: GameLeaderboardQuery,
      ...(rateLimit === undefined ? {} : { beforeHandle: rateLimit("leaderboardRead") }),
      response: { 200: LeaderboardList },
      detail: {
        tags: ["leaderboards"],
        summary: "Read the best scores of a game (platform api key)",
      },
    },
  );
