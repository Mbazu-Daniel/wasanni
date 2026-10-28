import {
  BracketSingle,
  PERMISSION,
  ParticipantSingle,
  PlatformJoinBody,
  PlatformJoinParams,
  PlatformTournamentParams,
  PlatformTournamentQuery,
  TournamentLeaderboard,
  TournamentList,
  TournamentSingle,
} from "@wasanni/contracts";
import { t } from "elysia";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { CompetitionServices } from "./types.ts";

export const createPlatformTournamentRoutes = <T extends PrincipalApi>(
  api: T,
  deps: CompetitionServices,
) =>
  api
    .get(
      "/api/v1/tournaments",
      async ({ principal, query }) => ({
        tournaments: await deps.tournaments.listOpen(
          organizationScope(principal),
          query.gameId,
        ),
      }),
      {
        platformAuth: PERMISSION.tournamentRead,
        query: PlatformTournamentQuery,
        response: { 200: TournamentList },
        detail: {
          tags: ["tournaments"],
          summary: "List open tournaments (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/tournaments/:tournamentId",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments.get(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        platformAuth: PERMISSION.tournamentRead,
        params: PlatformTournamentParams,
        response: { 200: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Get a tournament (platform api key)",
        },
      },
    )
    .post(
      "/api/v1/tournaments/:tournamentId/players/:externalUserId/join",
      async ({ principal, params, body, status }) => {
        const participant = await deps.participants.register(
          organizationScope(principal),
          {
            tournamentId: params.tournamentId,
            platformId: principal.platformId,
            externalUserId: params.externalUserId,
            ...(body?.displayName === undefined
              ? {}
              : { displayName: body.displayName }),
          },
        );
        return status(201, { participant });
      },
      {
        platformAuth: PERMISSION.tournamentRegister,
        params: PlatformJoinParams,
        body: t.Optional(PlatformJoinBody),
        response: { 201: ParticipantSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Join a player into a tournament (platform api key)",
        },
      },
    )
    .delete(
      "/api/v1/tournaments/:tournamentId/players/:externalUserId/leave",
      async ({ principal, params, status }) => {
        await deps.participants.withdraw(
          organizationScope(principal),
          params.tournamentId,
          {
            platformId: principal.platformId,
            externalUserId: params.externalUserId,
          },
        );
        return status(204);
      },
      {
        platformAuth: PERMISSION.tournamentRegister,
        params: PlatformJoinParams,
        detail: {
          tags: ["tournaments"],
          summary: "Remove a player from a tournament (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/tournaments/:tournamentId/leaderboards",
      async ({ principal, params }) =>
        deps.standings.leaderboards(
          organizationScope(principal),
          params.tournamentId,
        ),
      {
        platformAuth: PERMISSION.tournamentRead,
        params: PlatformTournamentParams,
        response: { 200: TournamentLeaderboard },
        detail: {
          tags: ["tournaments"],
          summary: "Read the ranked players of a tournament (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/tournaments/:tournamentId/bracket",
      async ({ principal, params }) => ({
        bracket: await deps.brackets.readBracket(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        platformAuth: PERMISSION.tournamentRead,
        params: PlatformTournamentParams,
        response: { 200: BracketSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Read the bracket of a tournament (platform api key)",
        },
      },
    );
