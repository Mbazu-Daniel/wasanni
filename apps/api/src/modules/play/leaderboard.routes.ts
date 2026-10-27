import { LeaderboardList, LeaderboardQuery, PERMISSION } from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { LeaderboardRouteDeps } from "./types.ts";

export const createLeaderboardRoutes = <T extends PrincipalApi>(
  api: T,
  { service, rateLimit }: LeaderboardRouteDeps,
) =>
  api.get(
    "/api/v1/platform/leaderboards",
    async ({ principal, query }) => ({
      entries: await service.list(
        organizationScope(principal),
        principal.platformId,
        query,
      ),
    }),
    {
      platformAuth: PERMISSION.scoreRead,
      query: LeaderboardQuery,
      ...(rateLimit === undefined ? {} : { beforeHandle: rateLimit("leaderboardRead") }),
      response: { 200: LeaderboardList },
      detail: { tags: ["leaderboards"], summary: "Read the leaderboard of a game" },
    },
  );
