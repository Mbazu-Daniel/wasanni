import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { game, gameFile, gamePlatformAssignment, platform, tournament } from "@wasanni/db/schema";
import { createParticipantsService } from "../competition/participants.service.ts";
import { readCurrentGameFile } from "../games/game-state.ts";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, ForbiddenError, newId, NotFoundError } from "@wasanni/kit";
import type { PlayTestView } from "@wasanni/contracts";
import type { SessionService } from "./types.ts";

export type PlayTestInput = {
  gameId: string;
  fileId?: string;
  platformId?: string;
  tournamentId?: string;
  externalName?: string;
};

export type PlayTestService = ReturnType<typeof createPlayTestService>;

export function createPlayTestService(db: Db, sessions: SessionService) {
  const participants = createParticipantsService(db);

  return {
    async playTest(scope: Scope, input: PlayTestInput): Promise<PlayTestView> {
      const [row] = await db
        .select({ id: game.id, hosting: game.hosting })
        .from(game)
        .where(scopeTo(scope, game, eq(game.id, input.gameId)))
        .limit(1);

      if (row === undefined) throw new NotFoundError("game not found");
      if (row.hosting !== "hosted") {
        throw new BadRequestError("an external game has no playable build");
      }

      let platformId = input.platformId ?? null;

      if (platformId === null && input.fileId !== undefined) {
        const [file] = await db
          .select({ platformId: gameFile.platformId })
          .from(gameFile)
          .where(scopeTo(scope, gameFile, eq(gameFile.id, input.fileId)))
          .limit(1);

        platformId = file?.platformId ?? null;
      }

      if (platformId === null) {
        const rows = await db
          .select({ platformId: gamePlatformAssignment.platformId })
          .from(gamePlatformAssignment)
          .innerJoin(platform, eq(platform.id, gamePlatformAssignment.platformId))
          .where(scopeTo(scope, gamePlatformAssignment, eq(gamePlatformAssignment.gameId, input.gameId)));

        if (rows.length === 0) {
          throw new BadRequestError("assign the game to a platform before playing it");
        }
        if (rows.length > 1) {
          throw new BadRequestError("this game is on several platforms, name the platform to play on");
        }
        platformId = (rows[0] as { platformId: string }).platformId;
      }

      let fileId = input.fileId ?? null;

      if (fileId !== null) {
        const [file] = await db
          .select({ id: gameFile.id, status: gameFile.status })
          .from(gameFile)
          .where(scopeTo(scope, gameFile, eq(gameFile.id, fileId), eq(gameFile.gameId, input.gameId)))
          .limit(1);

        if (file === undefined || file.status !== "ready") {
          throw new NotFoundError("game file not found");
        }
      } else {
        const current = await readCurrentGameFile(db, scope, input.gameId, platformId);

        if (current === undefined || current === null) throw new BadRequestError("this game has no ready build");
        fileId = current.id;
      }

      {
        const [assignment] = await db
          .select({ id: gamePlatformAssignment.id })
          .from(gamePlatformAssignment)
          .where(
            scopeTo(
              scope,
              gamePlatformAssignment,
              eq(gamePlatformAssignment.gameId, input.gameId),
              eq(gamePlatformAssignment.platformId, platformId),
            ),
          )
          .limit(1);

        if (assignment === undefined) {
          throw new ForbiddenError("this game is not assigned to the platform");
        }
      }

      let tournamentId: string | null = null;

      if (input.tournamentId !== undefined) {
        const [cup] = await db
          .select({ id: tournament.id, status: tournament.status })
          .from(tournament)
          .where(
            scopeTo(
              scope,
              tournament,
              eq(tournament.id, input.tournamentId),
              eq(tournament.gameId, input.gameId),
            ),
          )
          .limit(1);

        if (cup === undefined) throw new NotFoundError("tournament not found");
        if (cup.status !== "open" && cup.status !== "running") {
          throw new BadRequestError("the tournament is not accepting sessions");
        }
        tournamentId = cup.id;
      }

      const externalUserId = `playtest-${newId()}`;

      if (tournamentId !== null) {
        await participants.register(scope, {
          tournamentId,
          platformId,
          externalUserId,
          displayName: input.externalName ?? "Play tester",
        });
      }

      const created = await sessions.create(scope, {
        platformId,
        body: {
          gameId: input.gameId,
          externalUserId,
          ...(input.externalName === undefined ? {} : { externalName: input.externalName }),
          ...(tournamentId === null ? {} : { tournamentId }),
          gameFileId: fileId,
        },
      });

      return {
        sessionId: created.session.id,
        joinCode: created.joinCode,
        playUrl: created.playUrl,
        realtimeUrl: created.realtimeUrl,
      };
    },
  };
}
