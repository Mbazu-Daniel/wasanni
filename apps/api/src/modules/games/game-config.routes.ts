import {
  AssignmentParams,
  CreateGameConfigBody,
  GameConfigIdParams,
  GameConfigList,
  GameConfigSingle,
  PERMISSION,
  UpdateGameConfigBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { GameConfigService } from "./game-config.service.ts";

type GameConfigDeps = {
  service: GameConfigService;
};

export const createGameConfigRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: GameConfigDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments/:assignmentId/configs",
      async ({ principal, params }) => ({
        configs: await service.list(
          organizationScope(principal),
          params.gameId,
          params.assignmentId,
        ),
      }),
      {
        organizationAuth: PERMISSION.gameConfigRead,
        params: AssignmentParams,
        response: { 200: GameConfigList },
        detail: { tags: ["game-configs"], summary: "List the configs of an assignment" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments/:assignmentId/configs",
      async ({ principal, params, body, status }) => {
        const created = await service.create(organizationScope(principal), {
          gameId: params.gameId,
          assignmentId: params.assignmentId,
          body,
        });
        return status(201, { config: created });
      },
      {
        organizationAuth: PERMISSION.gameConfigCreate,
        params: AssignmentParams,
        body: CreateGameConfigBody,
        response: { 201: GameConfigSingle },
        detail: { tags: ["game-configs"], summary: "Create a config for an assignment" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments/:assignmentId/configs/:configId",
      async ({ principal, params, body }) => ({
        config: await service.update(organizationScope(principal), {
          gameId: params.gameId,
          assignmentId: params.assignmentId,
          configId: params.configId,
          body,
        }),
      }),
      {
        organizationAuth: PERMISSION.gameConfigUpdate,
        params: GameConfigIdParams,
        body: UpdateGameConfigBody,
        response: { 200: GameConfigSingle },
        detail: { tags: ["game-configs"], summary: "Update a config of an assignment" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/games/:gameId/assignments/:assignmentId/configs/:configId",
      async ({ principal, params, status }) => {
        await service.remove(
          organizationScope(principal),
          params.gameId,
          params.assignmentId,
          params.configId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.gameConfigDelete,
        params: GameConfigIdParams,
        detail: { tags: ["game-configs"], summary: "Delete a config of an assignment" },
      },
    );
