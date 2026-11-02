import type { Db } from "@wasanni/db";
import type { ObjectStorage } from "@wasanni/kit";
import type { UsageService } from "../usage/types.ts";
import type { SessionService } from "../play/types.ts";
import type { PrincipalApi, RateLimitHook } from "../../plugins/types.ts";
import { createBracketService } from "./bracket.service.ts";
import { createEnterRoutes } from "./enter.routes.ts";
import { createEnterService } from "./enter.service.ts";
import { createMatchRoutes } from "./match.routes.ts";
import { createMatchService } from "./match.service.ts";
import { createParticipantsService } from "./participants.service.ts";
import { createPlatformTournamentRoutes } from "./platform-tournament.routes.ts";
import { createStandingsService } from "./standings.service.ts";
import { createTournamentImageRoutes } from "./tournament-image.routes.ts";
import { createTournamentRoutes } from "./tournament.routes.ts";
import { createTournamentService } from "./tournament.service.ts";
import type { CompetitionServices } from "./types.ts";

export const createCompetition = (
  db: Db,
  usage: UsageService | null,
  storage: ObjectStorage,
) => {
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

  const mount = <T extends PrincipalApi>(
    api: T,
    play: { sessions: SessionService; rateLimit?: RateLimitHook },
  ) => {
    createTournamentRoutes(api, services);
    createTournamentImageRoutes(api, { db, storage });
    createMatchRoutes(api, services);
    createPlatformTournamentRoutes(api, services);
    createEnterRoutes(api, {
      enters: createEnterService(db, {
        sessions: play.sessions,
        participants,
        tournaments,
      }),
      ...(play.rateLimit === undefined ? {} : { rateLimit: play.rateLimit }),
    });
    return api;
  };

  return { ...services, mount };
};
