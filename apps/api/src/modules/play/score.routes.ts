import {
  GameSessionIdParams,
  HideScoresBody,
  HideScoresResult,
  PERMISSION,
  PlayerScoresParams,
  ScoreSingle,
  SubmitScoreBody,
} from "@wasanni/contracts";
import { t } from "elysia";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { ScoreRouteDeps } from "./types.ts";

export const createScoreRoutes = <T extends PrincipalApi>(
  api: T,
  { service, rateLimit }: ScoreRouteDeps,
) =>
  api
    .post(
      "/api/v1/play/sessions/:sessionId/score",
      async ({ sessionPrincipal, params, body, status }) => {
        const score = await service.submitFromClient(organizationScope(sessionPrincipal), {
          platformId: sessionPrincipal.platformId,
          sessionId: params.sessionId,
          body,
        });
        return status(201, { score });
      },
      {
        sessionAuth: true,
        params: GameSessionIdParams,
        ...(rateLimit === undefined ? {} : { beforeHandle: rateLimit("scoreSubmit") }),
        body: SubmitScoreBody,
        response: { 201: ScoreSingle },
        detail: { tags: ["scores"], summary: "Send the score of a game session" },
      },
    )
    .post(
      "/api/v1/platform/sessions/:sessionId/score",
      async ({ principal, params, body, status }) => {
        const score = await service.submitFromServer(organizationScope(principal), {
          platformId: principal.platformId,
          sessionId: params.sessionId,
          body,
        });
        return status(201, { score });
      },
      {
        platformAuth: PERMISSION.scoreCreate,
        params: GameSessionIdParams,
        body: SubmitScoreBody,
        response: { 201: ScoreSingle },
        detail: { tags: ["scores"], summary: "Record the score of a game session" },
      },
    )
    .post(
      "/api/v1/platform/players/:externalUserId/scores/hide",
      async ({ principal, params, body, status }) => {
        const hidden = await service.hideForPlayer(organizationScope(principal), {
          platformId: principal.platformId,
          externalUserId: params.externalUserId,
          ...(body?.gameId === undefined ? {} : { gameId: body.gameId }),
        });
        return status(200, { hidden });
      },
      {
        platformAuth: PERMISSION.scoreHide,
        params: PlayerScoresParams,
        body: t.Optional(HideScoresBody),
        response: { 200: HideScoresResult },
        detail: { tags: ["scores"], summary: "Hide the scores of a player" },
      },
    );
