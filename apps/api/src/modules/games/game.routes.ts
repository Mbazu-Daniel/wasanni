import {
  CreateGameBody,
  GameIdParams,
  GameList,
  GameSingle,
  ImageUploadTicketSingle,
  ListGamesQuery,
  PERMISSION,
  RequestImageUpload,
  SetImage,
  UpdateGameBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { GameRouteDeps } from "./types.ts";

export const createGameRoutes = <T extends PrincipalApi>(api: T, { service }: GameRouteDeps) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/games",
      async ({ principal, query }) => ({
        games: await service.list(organizationScope(principal), query),
      }),
      {
        organizationAuth: PERMISSION.gameRead,
        query: ListGamesQuery,
        response: { 200: GameList },
        detail: { tags: ["games"], summary: "List the organization's games" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games",
      async ({ principal, body, status }) => {
        const created = await service.create(organizationScope(principal), body);
        return status(201, { game: created });
      },
      {
        organizationAuth: PERMISSION.gameCreate,
        body: CreateGameBody,
        response: { 201: GameSingle },
        detail: { tags: ["games"], summary: "Create a game" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/games/:gameId",
      async ({ principal, params }) => ({
        game: await service.get(organizationScope(principal), params.gameId),
      }),
      {
        organizationAuth: PERMISSION.gameRead,
        params: GameIdParams,
        response: { 200: GameSingle },
        detail: { tags: ["games"], summary: "Get one game" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/games/:gameId",
      async ({ principal, params, body }) => ({
        game: await service.update(
          organizationScope(principal),
          params.gameId,
          body,
        ),
      }),
      {
        organizationAuth: PERMISSION.gameUpdate,
        params: GameIdParams,
        body: UpdateGameBody,
        response: { 200: GameSingle },
        detail: { tags: ["games"], summary: "Update a game" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/image",
      async ({ principal, params, body, status }) =>
        status(
          201,
          {
            upload: await service.imageTicket(
              organizationScope(principal),
              params.gameId,
              body.contentType,
            ),
          },
        ),
      {
        organizationAuth: PERMISSION.gameUpdate,
        params: GameIdParams,
        body: RequestImageUpload,
        response: { 201: ImageUploadTicketSingle },
        detail: {
          tags: ["games"],
          summary: "Request a presigned url to upload this game's image",
        },
      },
    )
    .put(
      "/api/v1/organizations/:organizationId/games/:gameId/image",
      async ({ principal, params, body }) => ({
        game: await service.attachImage(
          organizationScope(principal),
          params.gameId,
          body.key,
        ),
      }),
      {
        organizationAuth: PERMISSION.gameUpdate,
        params: GameIdParams,
        body: SetImage,
        response: { 200: GameSingle },
        detail: { tags: ["games"], summary: "Attach an uploaded game image" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/publish",
      async ({ principal, params }) => ({
        game: await service.publish(organizationScope(principal), params.gameId),
      }),
      {
        organizationAuth: PERMISSION.gamePublish,
        params: GameIdParams,
        response: { 200: GameSingle },
        detail: { tags: ["games"], summary: "Publish a game" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/archive",
      async ({ principal, params }) => ({
        game: await service.archive(organizationScope(principal), params.gameId),
      }),
      {
        organizationAuth: PERMISSION.gamePublish,
        params: GameIdParams,
        response: { 200: GameSingle },
        detail: { tags: ["games"], summary: "Archive a game" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/games/:gameId",
      async ({ principal, params, status }) => {
        await service.remove(organizationScope(principal), params.gameId);
        return status(204);
      },
      {
        organizationAuth: PERMISSION.gameDelete,
        params: GameIdParams,
        detail: { tags: ["games"], summary: "Delete a game" },
      },
    );
