import type { Db } from "@wasanni/db";
import type { UsageService } from "../usage/types.ts";
import type { PrincipalApi } from "../../plugins/types.ts";
import { createBracketService } from "./bracket.service.ts";
import { createMatchRoutes } from "./match.routes.ts";
import { createMatchService } from "./match.service.ts";
import { createParticipantsService } from "./participants.service.ts";
import { createPlatformTournamentRoutes } from "./platform-tournament.routes.ts";
import { createStandingsService } from "./standings.service.ts";
import { createTournamentRoutes } from "./tournament.routes.ts";
import { createTournamentService } from "./tournament.service.ts";

export const createCompetition = (db: Db, usage: UsageService | null) => {
  const brackets = createBracketService(db);
  const matches = createMatchService(db, usage);
  const tournaments = createTournamentService(db, usage);
  const participants = createParticipantsService(db);
  const standings = createStandingsService(db, { bracket: brackets });

  const mount = <T extends PrincipalApi>(api: T) => {
    const deps = { tournaments, participants, matches, brackets, standings };

    createTournamentRoutes(api, deps);
    createMatchRoutes(api, deps);
    createPlatformTournamentRoutes(api, deps);
    return api;
  };

  return { matches, mount };
};
