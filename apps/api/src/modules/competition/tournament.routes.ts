import {
  BracketSingle,
  CreateTournamentBody,
  OrganizationIdParams,
  PERMISSION,
  ParticipantList,
  ParticipantParams,
  ParticipantSingle,
  RegisterParticipantBody,
  TournamentIdParams,
  TournamentList,
  TournamentQuery,
  TournamentSingle,
  UpdateTournamentBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { CompetitionRouteDeps } from "./types.ts";

export const createTournamentRoutes = <T extends PrincipalApi>(
  api: T,
  deps: CompetitionRouteDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/tournaments",
      async ({ principal, query }) => ({
        tournaments: await deps.tournaments.list(
          organizationScope(principal),
          query,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentRead,
        params: OrganizationIdParams,
        query: TournamentQuery,
        response: { 200: TournamentList },
        detail: { tags: ["tournaments"], summary: "List tournaments" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/tournaments",
      async ({ principal, body, status }) => {
        const tournament = await deps.tournaments.create(
          organizationScope(principal),
          { body },
        );
        return status(201, { tournament });
      },
      {
        organizationAuth: PERMISSION.tournamentCreate,
        params: OrganizationIdParams,
        body: CreateTournamentBody,
        response: { 201: TournamentSingle },
        detail: { tags: ["tournaments"], summary: "Create a tournament" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments.get(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentRead,
        params: TournamentIdParams,
        response: { 200: TournamentSingle },
        detail: { tags: ["tournaments"], summary: "Get a tournament" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId",
      async ({ principal, params, body }) => ({
        tournament: await deps.tournaments.update(organizationScope(principal), {
          tournamentId: params.tournamentId,
          body,
        }),
      }),
      {
        organizationAuth: PERMISSION.tournamentUpdate,
        params: TournamentIdParams,
        body: UpdateTournamentBody,
        response: { 200: TournamentSingle },
        detail: { tags: ["tournaments"], summary: "Update a tournament" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/open",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments.open(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentStart,
        params: TournamentIdParams,
        response: { 200: TournamentSingle },
        detail: { tags: ["tournaments"], summary: "Open registration" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/seed",
      async ({ principal, params }) => ({
        bracket: await deps.brackets.generateBracket(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentSeed,
        params: TournamentIdParams,
        response: { 200: BracketSingle },
        detail: { tags: ["tournaments"], summary: "Seed a bracket and start" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/cancel",
      async ({ principal, params }) => ({
        tournament: await deps.tournaments.cancel(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentUpdate,
        params: TournamentIdParams,
        response: { 200: TournamentSingle },
        detail: { tags: ["tournaments"], summary: "Cancel a tournament" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/participants",
      async ({ principal, params }) => ({
        participants: await deps.tournaments.listParticipants(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentRead,
        params: TournamentIdParams,
        response: { 200: ParticipantList },
        detail: { tags: ["tournaments"], summary: "List participants" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/participants",
      async ({ principal, params, body, status }) => {
        const participant = await deps.tournaments.register(
          organizationScope(principal),
          {
            tournamentId: params.tournamentId,
            platformId: body.platformId,
            externalUserId: body.externalUserId,
            ...(body.displayName === undefined
              ? {}
              : { displayName: body.displayName }),
          },
        );
        return status(201, { participant });
      },
      {
        organizationAuth: PERMISSION.tournamentRegister,
        params: TournamentIdParams,
        body: RegisterParticipantBody,
        response: { 201: ParticipantSingle },
        detail: { tags: ["tournaments"], summary: "Register a player" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/participants/:participantId",
      async ({ principal, params, status }) => {
        await deps.tournaments.withdraw(
          organizationScope(principal),
          params.tournamentId,
          { participantId: params.participantId },
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.tournamentRegister,
        params: ParticipantParams,
        detail: { tags: ["tournaments"], summary: "Withdraw a participant" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/bracket",
      async ({ principal, params }) => ({
        bracket: await deps.brackets.readBracket(
          organizationScope(principal),
          params.tournamentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.tournamentRead,
        params: TournamentIdParams,
        response: { 200: BracketSingle },
        detail: { tags: ["tournaments"], summary: "Read the bracket" },
      },
    );
