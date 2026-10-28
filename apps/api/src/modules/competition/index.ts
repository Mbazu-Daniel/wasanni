import type { Db } from "@wasanni/db";
import type { PrincipalApi } from "../../plugins/types.ts";
import { createBracketService } from "./bracket.service.ts";
import { createMatchRoutes } from "./match.routes.ts";
import { createMatchService } from "./match.service.ts";
import { createPlatformTournamentRoutes } from "./platform-tournament.routes.ts";
import { createStandingsService } from "./standings.service.ts";
import { createTournamentRoutes } from "./tournament.routes.ts";
import { createTournamentService } from "./tournament.service.ts";

export const createCompetition = (db: Db) => {
  const brackets = createBracketService(db);
  const matches = createMatchService(db);
  const tournaments = createTournamentService(db);
  const standings = createStandingsService(db, { bracket: brackets });

  const mount = <T extends PrincipalApi>(api: T) => {
    createTournamentRoutes(api, { tournaments, matches, brackets, standings });
    createMatchRoutes(api, { tournaments, matches, brackets, standings });
    createPlatformTournamentRoutes(api, {
      tournaments,
      matches,
      brackets,
      standings,
    });
    return api;
  };

  return { matches, mount };
};
