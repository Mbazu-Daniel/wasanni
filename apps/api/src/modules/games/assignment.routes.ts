import {
  AssignmentIdParams,
  AssignmentList,
  AssignmentSingle,
  CreateAssignmentBody,
  GameIdParams,
  PERMISSION,
  PlatformIdParams,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { AssignmentService } from "./assignment.service.ts";

type AssignmentDeps = {
  service: AssignmentService;
};

export const createAssignmentRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: AssignmentDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments",
      async ({ principal, params }) => ({
        assignments: await service.listByGame(
          organizationScope(principal),
          params.gameId,
        ),
      }),
      {
        organizationAuth: PERMISSION.assignmentRead,
        params: GameIdParams,
        response: { 200: AssignmentList },
        detail: { tags: ["assignments"], summary: "List the platforms a game is on" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments",
      async ({ principal, params, body, status }) => {
        const created = await service.create(organizationScope(principal), {
          gameId: params.gameId,
          memberId: principal.memberId,
          platformId: body.platformId,
        });
        return status(201, { assignment: created });
      },
      {
        organizationAuth: PERMISSION.assignmentCreate,
        params: GameIdParams,
        body: CreateAssignmentBody,
        response: { 201: AssignmentSingle },
        detail: { tags: ["assignments"], summary: "Put a game on a platform" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments/:assignmentId",
      async ({ principal, params, status }) => {
        await service.remove(
          organizationScope(principal),
          params.gameId,
          params.assignmentId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.assignmentDelete,
        params: AssignmentIdParams,
        detail: { tags: ["assignments"], summary: "Take a game off a platform" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/platforms/:platformId/games",
      async ({ principal, params }) => ({
        assignments: await service.listGamesByPlatform(
          organizationScope(principal),
          params.platformId,
        ),
      }),
      {
        organizationAuth: PERMISSION.assignmentRead,
        params: PlatformIdParams,
        response: { 200: AssignmentList },
        detail: { tags: ["assignments"], summary: "List the games on a platform" },
      },
    );
