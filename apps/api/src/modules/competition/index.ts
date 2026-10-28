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
import type { CompetitionServices } from "./types.ts";

export const createCompetition = (db: Db, usage: UsageService | null) => {
  const brackets = createBracketService(db);
  const matches = createMatchService(db, usage);
  const tournaments = createTournamentService(db, usage);
  const participants = createParticipantsService(db);
  const standings = createStandingsService(db, { bracket: brackets });

  const services: CompetitionServices = {
    brackets,
    matches,
    participants,
    standings,
    tournaments,
  };

  const mount = <T extends PrincipalApi>(api: T) => {
    createTournamentRoutes(api, services);
    createMatchRoutes(api, services);
    createPlatformTournamentRoutes(api, services);
    return api;
  };

  return { ...services, mount };
};
