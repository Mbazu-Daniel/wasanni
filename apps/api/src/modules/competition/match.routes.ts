import {
  CompleteMatchBody,
  CreateMatchBody,
  MatchIdParams,
  MatchParticipants,
  MatchSingle,
  OrganizationIdParams,
  PERMISSION,
  PlatformMatchParams,
  PlatformWinnerBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { CompetitionRouteDeps } from "./types.ts";

export const createMatchRoutes = <T extends PrincipalApi>(
  api: T,
  deps: CompetitionRouteDeps,
) =>
  api
    .post(
      "/api/v1/organizations/:organizationId/matches",
      async ({ principal, body, status }) => {
        const match = await deps.matches.create(organizationScope(principal), {
          body,
        });
        return status(201, { match });
      },
      {
        organizationAuth: PERMISSION.matchCreate,
        params: OrganizationIdParams,
        body: CreateMatchBody,
        response: { 201: MatchSingle },
        detail: { tags: ["matches"], summary: "Create a standalone match" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/matches/:matchId",
      async ({ principal, params }) => {
        const scope = organizationScope(principal);
        return {
          match: await deps.matches.get(scope, params.matchId),
          participants: await deps.matches.listParticipants(
            scope,
            params.matchId,
          ),
        };
      },
      {
        organizationAuth: PERMISSION.matchRead,
        params: MatchIdParams,
        response: { 200: MatchParticipants },
        detail: { tags: ["matches"], summary: "Get a match" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/matches/:matchId/complete",
      async ({ principal, params, body }) => ({
        match: await deps.matches.complete(organizationScope(principal), {
          matchId: params.matchId,
          ...(body.winnerParticipantId === undefined
            ? {}
            : { winnerParticipantId: body.winnerParticipantId }),
          ...(body.winnerExternal === undefined
            ? {}
            : { winnerExternal: body.winnerExternal }),
        }),
      }),
      {
        organizationAuth: PERMISSION.matchComplete,
        params: MatchIdParams,
        body: CompleteMatchBody,
        response: { 200: MatchSingle },
        detail: { tags: ["matches"], summary: "Complete a match" },
      },
    )
    .post(
      "/api/v1/platform/matches/:matchId/complete",
      async ({ principal, params, body }) => ({
        match: await deps.matches.complete(organizationScope(principal), {
          matchId: params.matchId,
          winnerExternal: {
            platformId: principal.platformId,
            externalUserId: body.externalUserId,
          },
        }),
      }),
      {
        platformAuth: PERMISSION.matchComplete,
        params: PlatformMatchParams,
        body: PlatformWinnerBody,
        response: { 200: MatchSingle },
        detail: {
          tags: ["matches"],
          summary: "Declare the platform's winner",
        },
      },
    );
