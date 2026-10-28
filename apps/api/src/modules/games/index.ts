import type { PrincipalApi } from "../../plugins/types.ts";
import { createAssignmentRoutes } from "./assignment.routes.ts";
import { createAssignmentService } from "./assignment.service.ts";
import { createGameConfigRoutes } from "./game-config.routes.ts";
import { createGameConfigService } from "./game-config.service.ts";
import { createGameFileRoutes } from "./game-file.routes.ts";
import { createGameFileService } from "./game-file.service.ts";
import { createGameRoutes } from "./game.routes.ts";
import { createGameService } from "./game.service.ts";
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
  const configs = createGameConfigService(deps.db, deps.onConfigChanged);

  createGameRoutes(api, { service: games });
  createGameFileRoutes(api, { service: files });
  createAssignmentRoutes(api, { service: assignments });
  createGameConfigRoutes(api, { service: configs });
  createPlayRoutes(api, deps.db, deps.storage, deps.usage ?? null, deps.redis ?? null);

  return api;
};
