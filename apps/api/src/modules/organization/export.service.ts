import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import {
  game,
  gameConfig,
  gameFile,
  gamePlatformAssignment,
  gameSession,
  gameSessionScore,
  invitation,
  match,
  member,
  organization,
  platform,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { NotFoundError } from "@wasanni/kit";
import { EXPORT_ROW_LIMIT } from "./constants.ts";

export function createExportService(db: Db) {
  return {
    async exportOrganizationData(organizationId: string) {
      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (org === undefined) throw new NotFoundError("organization not found");

      const [
        members,
        invitations,
        platforms,
        games,
        files,
        assignments,
        configs,
        tournaments,
        tournamentParticipants,
        matches,
        sessions,
        scores,
      ] = await Promise.all([
        db.select().from(member).where(eq(member.organizationId, organizationId)),
        db.select().from(invitation).where(eq(invitation.organizationId, organizationId)),
        db.select().from(platform).where(eq(platform.organizationId, organizationId)),
        db.select().from(game).where(eq(game.organizationId, organizationId)),
        db.select().from(gameFile).where(eq(gameFile.organizationId, organizationId)),
        db
          .select()
          .from(gamePlatformAssignment)
          .where(eq(gamePlatformAssignment.organizationId, organizationId)),
        db.select().from(gameConfig).where(eq(gameConfig.organizationId, organizationId)),
        db.select().from(tournament).where(eq(tournament.organizationId, organizationId)),
        db
          .select()
          .from(tournamentParticipant)
          .where(eq(tournamentParticipant.organizationId, organizationId)),
        db.select().from(match).where(eq(match.organizationId, organizationId)),
        db
          .select()
          .from(gameSession)
          .where(eq(gameSession.organizationId, organizationId))
          .limit(EXPORT_ROW_LIMIT),
        db
          .select()
          .from(gameSessionScore)
          .where(eq(gameSessionScore.organizationId, organizationId))
          .limit(EXPORT_ROW_LIMIT),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        organization: { id: org.id, name: org.name, slug: org.slug },
        counts: {
          members: members.length,
          invitations: invitations.length,
          platforms: platforms.length,
          games: games.length,
          gameFiles: files.length,
          assignments: assignments.length,
          configs: configs.length,
          tournaments: tournaments.length,
          tournamentParticipants: tournamentParticipants.length,
          matches: matches.length,
          sessions: sessions.length,
          scores: scores.length,
        },
        limits: { sessions: EXPORT_ROW_LIMIT, scores: EXPORT_ROW_LIMIT },
        data: {
          members,
          invitations,
          platforms,
          games,
          gameFiles: files,
          assignments,
          configs,
          tournaments,
          tournamentParticipants,
          matches,
          sessions,
          scores,
        },
      };
    },
  };
}
