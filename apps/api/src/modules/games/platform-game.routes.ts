import {
  AssignmentList,
  CallerPlatformParams,
  DownloadUrlSingle,
  GameConfigList,
  GameFileList,
  PERMISSION,
  PlatformGameFileParams,
  PlatformGameParams,
} from "@wasanni/contracts";
import { ForbiddenError, organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { readAssignmentState } from "./game-state.ts";
import type { PlatformGameRouteDeps } from "./types.ts";

export const createPlatformGameRoutes = <T extends PrincipalApi>(
  api: T,
  { db, assignments, configs, files }: PlatformGameRouteDeps,
) =>
  api
    .get(
      "/api/v1/platforms/:platformId/games",
      async ({ principal, params }) => {
        if (params.platformId !== principal.platformId) {
          throw new ForbiddenError("this api key belongs to another platform");
        }
        return {
          assignments: await assignments.listGamesByPlatform(
            organizationScope(principal),
            principal.platformId,
          ),
        };
      },
      {
        platformAuth: PERMISSION.assignmentRead,
        params: CallerPlatformParams,
        response: { 200: AssignmentList },
        detail: {
          tags: ["games"],
          summary: "List the games assigned to this platform (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/games/:gameId/configs",
      async ({ principal, params }) => {
        const scope = organizationScope(principal);
        const assignment = await readAssignmentState(
          db,
          scope,
          principal.platformId,
          params.gameId,
        );
        if (assignment === null) throw new ForbiddenError("this game is not assigned to your platform");

        return {
          configs: await configs.list(scope, params.gameId, assignment.id),
        };
      },
      {
        platformAuth: PERMISSION.gameConfigRead,
        params: PlatformGameParams,
        response: { 200: GameConfigList },
        detail: {
          tags: ["games"],
          summary: "List the configs this platform has for a game (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/games/:gameId/files",
      async ({ principal, params }) => {
        const scope = organizationScope(principal);
        const assignment = await readAssignmentState(
          db,
          scope,
          principal.platformId,
          params.gameId,
        );
        if (assignment === null) throw new ForbiddenError("this game is not assigned to your platform");

        return { files: await files.list(scope, params.gameId) };
      },
      {
        platformAuth: PERMISSION.gameFileRead,
        params: PlatformGameParams,
        response: { 200: GameFileList },
        detail: {
          tags: ["games"],
          summary: "List the files of a game this platform holds (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/games/:gameId/files/:fileId/download-url",
      async ({ principal, params }) => {
        const scope = organizationScope(principal);
        const assignment = await readAssignmentState(
          db,
          scope,
          principal.platformId,
          params.gameId,
        );
        if (assignment === null) throw new ForbiddenError("this game is not assigned to your platform");

        return {
          url: await files.createDownloadUrl(
            scope,
            params.gameId,
            params.fileId,
          ),
        };
      },
      {
        platformAuth: PERMISSION.gameFileRead,
        params: PlatformGameFileParams,
        response: { 200: DownloadUrlSingle },
        detail: {
          tags: ["games"],
          summary: "Ask for a download url of a game file (platform api key)",
        },
      },
    );
