export type TournamentFormat = "leaderboard" | "bracket";

export type TournamentRow = {
  id: string;
  organizationId: string;
  gameId: string;
  assignmentId: string | null;
  gameConfigId: string | null;
  name: string;
  slug: string;
  description: string | null;
  format: TournamentFormat;
  status: string;
  maxParticipants: number | null;
  startsAt: string | null;
  endsAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  game?: { id: string; name: string; slug: string; hosting: string } | null;
  platform?: { id: string; name: string; slug: string } | null;
};

export type ParticipantRow = {
  id: string;
  tournamentId: string;
  platformId: string;
  externalUserId: string;
  displayName: string | null;
  seed: number | null;
  status: string;
  registeredAt: string;
};

export type MatchParticipant = {
  id: string;
  slot: number;
  externalUserId: string;
  displayName: string | null;
  seed: number | null;
  score: number | null;
  outcome: string;
};

export type BracketMatch = {
  id: string;
  bracketRound: number;
  bracketSlot: number;
  status: string;
  name: string | null;
  winnerParticipantId: string | null;
  participants: MatchParticipant[];
};

export type BracketView = {
  tournamentId: string;
  bracketSize: number;
  totalRounds: number;
  currentRound: number | null;
  rounds: { round: number; matches: BracketMatch[] }[];
};

export type StandingsRow = {
  position: number;
  participantId?: string;
  externalUserId: string;
  displayName: string | null;
  seed?: number | null;
  status?: string;
  score: number | null;
  flagged: boolean;
  flags?: string[];
  submittedAt?: string | null;
};
