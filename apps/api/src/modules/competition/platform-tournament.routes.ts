import {
  BracketSingle,
  PERMISSION,
  ParticipantSingle,
  PlatformRegisterBody,
  PlatformRegistrationParams,
  PlatformTournamentParams,
  PlatformTournamentQuery,
  Standings,
  TournamentList,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { CompetitionRouteDeps } from "./types.ts";

export const createPlatformTournamentRoutes = <T extends PrincipalApi>(
  api: T,
  deps: CompetitionRouteDeps,
) =>
  api
    .get(
      "/api/v1/platform/tournaments",
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
        detail: { tags: ["tournaments"], summary: "List open tournaments" },
      },
    )
    .post(
      "/api/v1/platform/tournaments/:tournamentId/register",
      async ({ principal, params, body, status }) => {
        const participant = await deps.participants.register(
          organizationScope(principal),
          {
            tournamentId: params.tournamentId,
            platformId: principal.platformId,
            externalUserId: body.externalUserId,
            ...(body.displayName === undefined
              ? {}
              : { displayName: body.displayName }),
          },
        );
        return status(201, { participant });
      },
      {
        platformAuth: PERMISSION.tournamentRegister,
        params: PlatformTournamentParams,
        body: PlatformRegisterBody,
        response: { 201: ParticipantSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Register one of the platform's players",
        },
      },
    )
    .delete(
      "/api/v1/platform/tournaments/:tournamentId/register/:externalUserId",
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
        params: PlatformRegistrationParams,
        detail: { tags: ["tournaments"], summary: "Withdraw a player" },
      },
    )
    .get(
      "/api/v1/platform/tournaments/:tournamentId/standings",
      async ({ principal, params }) =>
        deps.standings.read(
          organizationScope(principal),
          params.tournamentId,
        ),
      {
        platformAuth: PERMISSION.tournamentRead,
        params: PlatformTournamentParams,
        response: { 200: Standings },
        detail: { tags: ["tournaments"], summary: "Tournament standings" },
      },
    )
    .get(
      "/api/v1/platform/tournaments/:tournamentId/bracket",
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
        detail: { tags: ["tournaments"], summary: "Read the bracket" },
      },
    );
