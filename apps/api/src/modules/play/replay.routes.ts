import { GameSessionIdParams, PERMISSION, ReplayView } from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { ReplayRouteDeps } from "./types.ts";

export const createReplayRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: ReplayRouteDeps,
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
