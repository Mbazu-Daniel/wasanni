import { eq } from "drizzle-orm";
import { game, gameFile } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { AgentGamePort } from "../agent/types.ts";
import type { PrincipalApi } from "../../plugins/types.ts";
import { createAssignmentRoutes } from "./assignment.routes.ts";
import { createAssignmentService } from "./assignment.service.ts";
import { createGameConfigRoutes } from "./game-config.routes.ts";
import { createGameConfigService } from "./game-config.service.ts";
import { createGameFileRoutes } from "./game-file.routes.ts";
import { createGameFileService } from "./game-file.service.ts";
import { createGameRoutes } from "./game.routes.ts";
import { createGameService } from "./game.service.ts";
import { createPlatformGameRoutes } from "./platform-game.routes.ts";
import { createPlayRoutes } from "./play.routes.ts";
import type { GamesDeps } from "./types.ts";

export const createGamesRoutes = <T extends PrincipalApi>(api: T, deps: GamesDeps) => {
  const games = createGameService(deps.db, deps.storage);
  const files = createGameFileService(
    deps.db,
    deps.storage,
    deps.config,
    deps.enqueuer ?? null,
  );
  const assignments = createAssignmentService(deps.db);
  const configs = createGameConfigService(deps.db, deps.encryptionKey, deps.onConfigChanged);

  createGameRoutes(api, { service: games });
  createGameFileRoutes(api, { service: files });
  createAssignmentRoutes(api, { service: assignments });
  createGameConfigRoutes(api, { service: configs });
  createPlatformGameRoutes(api, { db: deps.db, assignments, configs, files });
  createPlayRoutes(api, deps.db, deps.storage, deps.usage ?? null, deps.redis ?? null);

  return api;
};

export const createAgentGamePort = (deps: Pick<GamesDeps, "db" | "storage" | "config">): AgentGamePort => {
  const games = createGameService(deps.db, deps.storage);
  const files = createGameFileService(deps.db, deps.storage, deps.config, null);

  return {
    list: (scope) => games.list(scope, {}),
    async context(scope, gameId) {
      const [row] = await deps.db
        .select({
          id: game.id,
          name: game.name,
          slug: game.slug,
          hosting: game.hosting,
          status: game.status,
        })
        .from(game)
        .where(scopeTo(scope, game, eq(game.id, gameId)))
        .limit(1);

      if (row === undefined) return null;

      const [current] = await deps.db
        .select({ version: gameFile.version })
        .from(gameFile)
        .where(
          scopeTo(
            scope,
            gameFile,
            eq(gameFile.gameId, gameId),
            eq(gameFile.isCurrent, true),
          ),
        )
        .limit(1);

      return { ...row, currentVersion: current?.version ?? null };
    },
    async deploy(scope, memberId, gameId, html) {
      const file = await files.putPublishedBundle(scope, gameId, { memberId, html });
      await games.publish(scope, gameId);

      return file.version;
    },
  };
};
