import {
  BracketSingle,
  CreateTournamentBody,
  PERMISSION,
  PlatformJoinParams,
  PlatformLeaveBody,
  PlatformTournamentParams,
  PlatformTournamentQuery,
  TournamentLeaderboard,
  TournamentList,
  TournamentSingle,
  UpdateTournamentBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import { callingPlatform } from "../../plugins/principal.ts";
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
          query.status,
        ),
      }),
      {
        platformAuth: PERMISSION.tournamentRead,
        query: PlatformTournamentQuery,
        response: { 200: TournamentList },
        detail: {
          tags: ["tournaments"],
          summary: "List tournaments",
        },
      },
    )
    .post(
      "/api/v1/tournaments",
      async ({ principal, body, status }) =>
        status(
          201,
          {
            tournament: await deps.tournaments
              .forPlatform(organizationScope(principal), callingPlatform(principal))
              .create(body),
          },
        ),
      {
        platformAuth: PERMISSION.tournamentCreate,
        body: CreateTournamentBody,
        response: { 201: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Create a tournament",
        },
      },
    )
    .patch(
      "/api/v1/tournaments/:tournamentId",
      async ({ principal, params, body }) => ({
        tournament: await deps.tournaments
          .forPlatform(organizationScope(principal), callingPlatform(principal))
          .update({ tournamentId: params.tournamentId, body }),
      }),
      {
        platformAuth: PERMISSION.tournamentUpdate,
        params: PlatformTournamentParams,
        body: UpdateTournamentBody,
        response: { 200: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Update a tournament",
        },
      },
    )
    .post(
      "/api/v1/tournaments/:tournamentId/open",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments
          .forPlatform(organizationScope(principal), callingPlatform(principal))
          .open(params.tournamentId),
      }),
      {
        platformAuth: PERMISSION.tournamentStart,
        params: PlatformTournamentParams,
        response: { 200: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Open registration",
        },
      },
    )
    .post(
      "/api/v1/tournaments/:tournamentId/seed",
      async ({ principal, params }) => {
        await deps.tournaments.requirePlatformTournament(
          organizationScope(principal),
          callingPlatform(principal),
          params.tournamentId,
        );

        return {
          bracket: await deps.brackets.generateBracket(
            organizationScope(principal),
            params.tournamentId,
          ),
        };
      },
      {
        platformAuth: PERMISSION.tournamentSeed,
        params: PlatformTournamentParams,
        response: { 200: BracketSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Seed a bracket and start",
        },
      },
    )
    .post(
      "/api/v1/tournaments/:tournamentId/cancel",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments
          .forPlatform(organizationScope(principal), callingPlatform(principal))
          .cancel(params.tournamentId),
      }),
      {
        platformAuth: PERMISSION.tournamentUpdate,
        params: PlatformTournamentParams,
        response: { 200: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Cancel a tournament",
        },
      },
    )
    .post(
      "/api/v1/tournaments/:tournamentId/complete",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments
          .forPlatform(organizationScope(principal), callingPlatform(principal))
          .complete(params.tournamentId),
      }),
      {
        platformAuth: PERMISSION.tournamentUpdate,
        params: PlatformTournamentParams,
        response: { 200: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Mark a leaderboard tournament complete",
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
          summary: "Get a tournament",
        },
      },
    )
    .delete(
      "/api/v1/tournaments/:tournamentId/players/:externalUserId/leave",
      async ({ principal, params, body, status }) => {
        await deps.participants.withdraw(
          organizationScope(principal),
          params.tournamentId,
          {
            platformId: body.platformId,
            externalUserId: params.externalUserId,
          },
        );
        return status(204);
      },
      {
        platformAuth: PERMISSION.tournamentRegister,
        params: PlatformJoinParams,
        body: PlatformLeaveBody,
        detail: {
          tags: ["tournaments"],
          summary: "Remove a player from a tournament",
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
          summary: "Read the ranked players of a tournament",
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
          summary: "Read the bracket of a tournament",
        },
      },
    );
