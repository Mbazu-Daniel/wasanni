import type {
  CreateMatchBody,
  CreateTournamentBody,
  UpdateTournamentBody,
} from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import type {
  match,
  matchParticipant,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import type { Scope } from "@wasanni/kit";
import type { createBracketService } from "./bracket.service.ts";
import type { createMatchService } from "./match.service.ts";
import type { createStandingsService } from "./standings.service.ts";
import type { createTournamentService } from "./tournament.service.ts";

export type TournamentRow = typeof tournament.$inferSelect;

export type TournamentParticipantRow = typeof tournamentParticipant.$inferSelect;

export type MatchRow = typeof match.$inferSelect;

export type MatchParticipantRow = typeof matchParticipant.$inferSelect;

export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type Executor = Db | Transaction;

export type BracketNode = {
  round: number;
  slot: number;
  homeSeed: number | null;
  awaySeed: number | null;
  nextRound: number | null;
  nextSlot: number | null;
  nextSide: number | null;
};

export type CreateTournamentInput = {
  body: CreateTournamentBody;
};

export type UpdateTournamentInput = {
  tournamentId: string;
  body: UpdateTournamentBody;
};

export type TournamentFilter = {
  gameId?: string;
  status?: TournamentRow["status"];
  format?: TournamentRow["format"];
};

export type RegisterParticipantInput = {
  tournamentId: string;
  platformId: string;
  externalUserId: string;
  displayName?: string;
};

export type CreateMatchInput = {
  body: CreateMatchBody;
};

export type CompleteMatchInput = {
  matchId: string;
  winnerParticipantId?: string;
  winnerExternal?: { platformId: string; externalUserId: string };
};

export type MatchListFilter = {
  gameId?: string;
  tournamentId?: string;
  status?: MatchRow["status"];
  cursor?: string;
  limit?: number;
};export type WithdrawTarget =
  | { participantId: string }
  | { platformId: string; externalUserId: string };

export type RecordParticipantScoreInput = {
  matchId: string;
  platformId: string;
  externalUserId: string;
  sessionId: string;
  score: number;
};

export type MatchRecorder = {
  recordParticipantScore(
    scope: Scope,
    input: RecordParticipantScoreInput,
  ): Promise<void>;
};

export type MatchService = ReturnType<typeof createMatchService>;

export type TournamentService = ReturnType<typeof createTournamentService>;

export type BracketService = ReturnType<typeof createBracketService>;

export type StandingsService = ReturnType<typeof createStandingsService>;

export type CompetitionRouteDeps = {
  tournaments: TournamentService;
  matches: MatchService;
  brackets: BracketService;
  standings: StandingsService;
};
