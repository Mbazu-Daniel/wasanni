import {
  CreateGameFileBody,
  DownloadUrlSingle,
  GameFileIdParams,
  GameFileList,
  GameFileSingle,
  GameFileUpload,
  GameIdParams,
  PERMISSION,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { GameFileRouteDeps } from "./types.ts";

export const createGameFileRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: GameFileRouteDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/games/:gameId/files",
      async ({ principal, params }) => ({
        files: await service.list(organizationScope(principal), params.gameId),
      }),
      {
        organizationAuth: PERMISSION.gameFileRead,
        params: GameIdParams,
        response: { 200: GameFileList },
        detail: { tags: ["game-files"], summary: "List the files of a game" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/files/upload",
      async ({ principal, params, body, status }) => {
        const result = await service.createUpload(organizationScope(principal), {
          gameId: params.gameId,
          memberId: principal.memberId,
          body,
        });
        return status(201, result);
      },
      {
        organizationAuth: PERMISSION.gameFileCreate,
        params: GameIdParams,
        body: CreateGameFileBody,
        response: { 201: GameFileUpload },
        detail: { tags: ["game-files"], summary: "Ask for an upload url for a game file" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/games/:gameId/files/:fileId/complete",
      async ({ principal, params }) => ({
        file: await service.completeUpload(
          organizationScope(principal),
          params.gameId,
          params.fileId,
        ),
      }),
      {
        organizationAuth: PERMISSION.gameFileCreate,
        params: GameFileIdParams,
        response: { 200: GameFileSingle },
        detail: { tags: ["game-files"], summary: "Confirm an uploaded game file" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/games/:gameId/files/:fileId/download-url",
      async ({ principal, params }) => ({
        url: await service.createDownloadUrl(
          organizationScope(principal),
          params.gameId,
          params.fileId,
        ),
      }),
      {
        organizationAuth: PERMISSION.gameFileRead,
        params: GameFileIdParams,
        response: { 200: DownloadUrlSingle },
        detail: { tags: ["game-files"], summary: "Ask for a download url for a game file" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/games/:gameId/files/:fileId",
      async ({ principal, params, status }) => {
        await service.remove(
          organizationScope(principal),
          params.gameId,
          params.fileId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.gameFileDelete,
        params: GameFileIdParams,
        detail: { tags: ["game-files"], summary: "Delete a game file" },
      },
    );
