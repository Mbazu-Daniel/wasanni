import {
  DuelEnterBody,
  DuelEnterView,
  PERMISSION,
  PlatformTournamentParams,
  TournamentEnterBody,
  TournamentEnterView,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import { callingPlatform } from "../../plugins/principal.ts";
import type { PrincipalApi, RateLimitHook } from "../../plugins/types.ts";
import type { EnterService } from "./enter.service.ts";

export const createEnterRoutes = <T extends PrincipalApi>(
  api: T,
  deps: { enters: EnterService; rateLimit?: RateLimitHook },
) => {
  const { enters, rateLimit } = deps;
  const limited =
    rateLimit === undefined ? {} : { beforeHandle: rateLimit("sessionCreate") };

  return api
    .post(
      "/api/v1/duels/enter",
      async ({ principal, body, status }) =>
        status(
          201,
          await enters.enterDuel(organizationScope(principal), {
            ...body,
            platformId: callingPlatform(principal, body.platformId),
          }),
        ),
      {
        platformAuth: PERMISSION.sessionCreate,
        body: DuelEnterBody,
        response: { 201: DuelEnterView },
        ...limited,
        detail: {
          tags: ["tournaments"],
          summary: "Enter the duel pool for a game",
        },
      },
    )
    .post(
      "/api/v1/tournaments/:tournamentId/enter",
      async ({ principal, params, body, status }) =>
        status(
          201,
          await enters.enterTournament(
            organizationScope(principal),
            params.tournamentId,
            {
              ...body,
              platformId: callingPlatform(principal, body.platformId),
            },
          ),
        ),
      {
        platformAuth: PERMISSION.tournamentRegister,
        params: PlatformTournamentParams,
        body: TournamentEnterBody,
        response: { 201: TournamentEnterView },
        ...limited,
        detail: {
          tags: ["tournaments"],
          summary:
            "Register and open a play session in one call",
        },
      },
    );
};
