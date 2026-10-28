import type {
  MatchParticipantView,
  MatchView,
  ParticipantView,
  TournamentView,
} from "@wasanni/contracts";
import type {
  MatchParticipantRow,
  MatchRow,
  TournamentParticipantRow,
  TournamentRow,
} from "./types.ts";

export const toTournamentView = (row: TournamentRow): TournamentView => ({
  id: row.id,
  organizationId: row.organizationId,
  gameId: row.gameId,
  assignmentId: row.assignmentId,
  gameConfigId: row.gameConfigId,
  templateId: row.templateId,
  name: row.name,
  slug: row.slug,
  description: row.description,
  format: row.format,
  status: row.status,
  maxParticipants: row.maxParticipants,
  startsAt: row.startsAt === null ? null : row.startsAt.toISOString(),
  endsAt: row.endsAt === null ? null : row.endsAt.toISOString(),
  startedAt: row.startedAt === null ? null : row.startedAt.toISOString(),
  completedAt: row.completedAt === null ? null : row.completedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toParticipantView = (
  row: TournamentParticipantRow,
): ParticipantView => ({
  id: row.id,
  organizationId: row.organizationId,
  tournamentId: row.tournamentId,
  platformId: row.platformId,
  externalUserId: row.externalUserId,
  displayName: row.displayName,
  seed: row.seed,
  status: row.status,
  registeredAt: row.registeredAt.toISOString(),
  withdrawnAt: row.withdrawnAt === null ? null : row.withdrawnAt.toISOString(),
});

export const toMatchView = (row: MatchRow): MatchView => ({
  id: row.id,
  organizationId: row.organizationId,
  gameId: row.gameId,
  tournamentId: row.tournamentId,
  name: row.name,
  bracketRound: row.bracketRound,
  bracketSlot: row.bracketSlot,
  status: row.status,
  winnerParticipantId: row.winnerParticipantId,
  startedAt: row.startedAt === null ? null : row.startedAt.toISOString(),
  completedAt: row.completedAt === null ? null : row.completedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toMatchParticipantView = (
  row: MatchParticipantRow,
): MatchParticipantView => ({
  id: row.id,
  matchId: row.matchId,
  slot: row.slot,
  platformId: row.platformId,
  externalUserId: row.externalUserId,
  displayName: row.displayName,
  seed: row.seed,
  sessionId: row.sessionId,
  score: row.score,
  placement: row.placement,
  outcome: row.outcome,
});
