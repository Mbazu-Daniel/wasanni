import {
  CompleteMatchBody,
  CreateMatchBody,
  MatchIdParams,
  MatchList,
  MatchListQuery,
  MatchParticipants,
  MatchSingle,
  OrganizationIdParams,
  PERMISSION,
  PlatformMatchParams,
  PlatformWinnerParams,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { CompetitionServices } from "./types.ts";

export const createMatchRoutes = <T extends PrincipalApi>(
  api: T,
  deps: CompetitionServices,
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
      "/api/v1/organizations/:organizationId/matches",
      async ({ principal, query }) =>
        deps.matches.listForOrganization(organizationScope(principal), {
          gameId: query.gameId,
          tournamentId: query.tournamentId,
          status: query.status,
          cursor: query.cursor,
          limit: query.limit,
        }),
      {
        organizationAuth: PERMISSION.matchRead,
        params: OrganizationIdParams,
        query: MatchListQuery,
        response: { 200: MatchList },
        detail: { tags: ["matches"], summary: "List the organization's matches" },
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
    .get(
      "/api/v1/matches/:matchId",
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
        platformAuth: PERMISSION.matchRead,
        params: PlatformMatchParams,
        response: { 200: MatchParticipants },
        detail: {
          tags: ["matches"],
          summary: "Get a match and its players (platform api key)",
        },
      },
    )
    .post(
      "/api/v1/matches/:matchId/players/:externalUserId/win",
      async ({ principal, params }) => ({
        match: await deps.matches.complete(organizationScope(principal), {
          matchId: params.matchId,
          winnerExternal: {
            platformId: principal.platformId,
            externalUserId: params.externalUserId,
          },
        }),
      }),
      {
        platformAuth: PERMISSION.matchComplete,
        params: PlatformWinnerParams,
        response: { 200: MatchSingle },
        detail: {
          tags: ["matches"],
          summary: "Declare the winning player of a match (platform api key)",
        },
      },
    );
