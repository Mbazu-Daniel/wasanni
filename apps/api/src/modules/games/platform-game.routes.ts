import {
  AssignmentList,
  CallerPlatformParams,
  DownloadUrlSingle,
  GameConfigList,
  GameFileList,
  OptionalPlatformQuery,
  PERMISSION,
  PlatformGameFileParams,
  PlatformGameParams,
} from "@wasanni/contracts";
import { ForbiddenError, NotFoundError, organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { platformInScope, readAssignmentState } from "./game-state.ts";
import type { PlatformGameRouteDeps } from "./types.ts";

export const createPlatformGameRoutes = <T extends PrincipalApi>(
  api: T,
  { db, assignments, configs, files }: PlatformGameRouteDeps,
) =>
  api
    .get(
      "/api/v1/platforms/:platformId/games",
      async ({ principal, params }) => {
        const scope = organizationScope(principal);
        if (!(await platformInScope(db, scope, params.platformId))) {
          throw new NotFoundError("platform not found");
        }
        return {
          assignments: await assignments.listGamesByPlatform(scope, params.platformId),
        };
      },
      {
        platformAuth: PERMISSION.assignmentRead,
        params: CallerPlatformParams,
        response: { 200: AssignmentList },
        detail: {
          tags: ["games"],
          summary: "List the games assigned to a platform of your organization (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/games/:gameId/configs",
      async ({ principal, params, query }) => {
        const scope = organizationScope(principal);
        const assignment =
          query.platformId === undefined
            ? null
            : await readAssignmentState(db, scope, query.platformId, params.gameId);

        if (query.platformId !== undefined && assignment === null) {
          throw new ForbiddenError("this game is not assigned to the platform");
        }

        return {
          configs: await configs.list(scope, params.gameId, assignment?.id),
        };
      },
      {
        platformAuth: PERMISSION.gameConfigRead,
        params: PlatformGameParams,
        query: OptionalPlatformQuery,
        response: { 200: GameConfigList },
        detail: {
          tags: ["games"],
          summary: "List the configs of a game across your organization (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/games/:gameId/files",
      async ({ principal, params, query }) => {
        const scope = organizationScope(principal);
        if (
          query.platformId !== undefined &&
          (await readAssignmentState(db, scope, query.platformId, params.gameId)) === null
        ) {
          throw new ForbiddenError("this game is not assigned to the platform");
        }

        return { files: await files.list(scope, params.gameId) };
      },
      {
        platformAuth: PERMISSION.gameFileRead,
        params: PlatformGameParams,
        query: OptionalPlatformQuery,
        response: { 200: GameFileList },
        detail: {
          tags: ["games"],
          summary: "List the files of a game in your organization (platform api key)",
        },
      },
    )
    .get(
      "/api/v1/games/:gameId/files/:fileId/download-url",
      async ({ principal, params, query }) => {
        const scope = organizationScope(principal);
        if (
          query.platformId !== undefined &&
          (await readAssignmentState(db, scope, query.platformId, params.gameId)) === null
        ) {
          throw new ForbiddenError("this game is not assigned to the platform");
        }

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
        query: OptionalPlatformQuery,
        response: { 200: DownloadUrlSingle },
        detail: {
          tags: ["games"],
          summary: "Ask for a download url of a game file (platform api key)",
        },
      },
    );
