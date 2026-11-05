import { PlayTestBody, PlayTestSingle, PERMISSION } from "@wasanni/contracts";
import { t } from "elysia";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi, RateLimitHook } from "../../plugins/types.ts";
import type { PlayTestService } from "./playtest.service.ts";

export type PlayTestRouteDeps = {
  service: PlayTestService;
  rateLimit?: RateLimitHook;
};

export const createPlayTestRoutes = <T extends PrincipalApi>(
  api: T,
  { service, rateLimit }: PlayTestRouteDeps,
) =>
  api.post(
    "/api/v1/organizations/:organizationId/games/:gameId/play-test",
    async ({ principal, params, body, status }) =>
      status(201, {
        playTest: await service.playTest(organizationScope(principal), {
          gameId: params.gameId,
          ...(body.fileId === undefined ? {} : { fileId: body.fileId }),
          ...(body.platformId === undefined ? {} : { platformId: body.platformId }),
          ...(body.tournamentId === undefined ? {} : { tournamentId: body.tournamentId }),
          ...(body.externalName === undefined ? {} : { externalName: body.externalName }),
        }),
      }),
    {
      organizationAuth: PERMISSION.sessionCreate,
      params: t.Object({ organizationId: t.String(), gameId: t.String() }),
      body: PlayTestBody,
      response: { 201: PlayTestSingle },
      ...(rateLimit === undefined ? {} : { beforeHandle: rateLimit("playTest") }),
      detail: { tags: ["play"], summary: "Open a play-test session with a join code" },
    },
  );
