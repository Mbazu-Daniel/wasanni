import {
  CreateGameSessionBody,
  CreatedGameSession,
  GameSessionIdParams,
  GameSessionSingle,
  PERMISSION,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { SessionRouteDeps } from "./types.ts";

export const createSessionRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: SessionRouteDeps,
) =>
  api
    .post(
      "/api/v1/platform/sessions",
      async ({ principal, body, status }) => {
        const created = await service.create(organizationScope(principal), {
          platformId: principal.platformId,
          body,
        });
        return status(201, created);
      },
      {
        platformAuth: PERMISSION.sessionCreate,
        body: CreateGameSessionBody,
        response: { 201: CreatedGameSession },
        detail: { tags: ["sessions"], summary: "Open a game session for a player" },
      },
    )
    .get(
      "/api/v1/platform/sessions/:sessionId",
      async ({ principal, params }) => ({
        session: await service.get(
          organizationScope(principal),
          principal.platformId,
          params.sessionId,
        ),
      }),
      {
        platformAuth: PERMISSION.sessionRead,
        params: GameSessionIdParams,
        response: { 200: GameSessionSingle },
        detail: { tags: ["sessions"], summary: "Read one game session" },
      },
    )
    .post(
      "/api/v1/platform/sessions/:sessionId/end",
      async ({ principal, params }) => ({
        session: await service.end(
          organizationScope(principal),
          principal.platformId,
          params.sessionId,
        ),
      }),
      {
        platformAuth: PERMISSION.sessionUpdate,
        params: GameSessionIdParams,
        response: { 200: GameSessionSingle },
        detail: { tags: ["sessions"], summary: "End a game session" },
      },
    );
