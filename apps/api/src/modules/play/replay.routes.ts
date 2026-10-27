import { GameSessionIdParams, PERMISSION, ReplayView } from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { ReplayService } from "./replay.service.ts";

type ReplayDeps = {
  service: ReplayService;
};

export const createReplayRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: ReplayDeps,
) =>
  api.get(
    "/api/v1/platform/sessions/:sessionId/events",
    async ({ principal, params }) =>
      service.getSessionEvents(
        organizationScope(principal),
        principal.platformId,
        params.sessionId,
      ),
    {
      platformAuth: PERMISSION.scoreRead,
      params: GameSessionIdParams,
      response: { 200: ReplayView },
      detail: { tags: ["replays"], summary: "Read the events of a game session" },
    },
  );
