export type MatchStatus = "pending" | "active" | "completed" | "cancelled";

export type MatchOutcome = "pending" | "won" | "lost" | "draw" | "disqualified";

export type MatchRow = {
  id: string;
  organizationId: string;
  gameId: string;
  tournamentId: string | null;
  name: string | null;
  bracketRound: number | null;
  bracketSlot: number | null;
  status: MatchStatus;
  winnerParticipantId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchParticipantRow = {
  id: string;
  matchId: string;
  slot: number;
  platformId: string;
  externalUserId: string;
  displayName: string | null;
  seed: number | null;
  sessionId: string | null;
  score: number | null;
  placement: number | null;
  outcome: MatchOutcome;
};

export type MatchWithParticipants = {
  match: MatchRow;
  participants: MatchParticipantRow[];
};

export type MatchListResponse = {
  data: MatchWithParticipants[];
  page: { limit: number; hasMore: boolean; cursor: string | null };
};
