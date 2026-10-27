import { t, type UnwrapSchema } from "elysia";

export const MATCH_STATUSES = ["pending", "active", "completed", "cancelled"] as const;

export const MatchStatus = t.Union([
  t.Literal("pending"),
  t.Literal("active"),
  t.Literal("completed"),
  t.Literal("cancelled"),
]);
export type MatchStatus = UnwrapSchema<typeof MatchStatus>;

export const MATCH_OUTCOMES = [
  "pending",
  "won",
  "lost",
  "draw",
  "disqualified",
] as const;

export const MatchOutcome = t.Union([
  t.Literal("pending"),
  t.Literal("won"),
  t.Literal("lost"),
  t.Literal("draw"),
  t.Literal("disqualified"),
]);
export type MatchOutcome = UnwrapSchema<typeof MatchOutcome>;

export const MatchView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  gameId: t.String(),
  tournamentId: t.Union([t.String(), t.Null()]),
  name: t.Union([t.String(), t.Null()]),
  bracketRound: t.Union([t.Number(), t.Null()]),
  bracketSlot: t.Union([t.Number(), t.Null()]),
  status: MatchStatus,
  winnerParticipantId: t.Union([t.String(), t.Null()]),
  startedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  completedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type MatchView = UnwrapSchema<typeof MatchView>;

export const MatchSingle = t.Object({ match: MatchView });
export type MatchSingle = UnwrapSchema<typeof MatchSingle>;

export const MatchParticipantView = t.Object({
  id: t.String(),
  matchId: t.String(),
  slot: t.Number(),
  platformId: t.String(),
  externalUserId: t.String(),
  displayName: t.Union([t.String(), t.Null()]),
  seed: t.Union([t.Number(), t.Null()]),
  sessionId: t.Union([t.String(), t.Null()]),
  score: t.Union([t.Number(), t.Null()]),
  placement: t.Union([t.Number(), t.Null()]),
  outcome: MatchOutcome,
});
export type MatchParticipantView = UnwrapSchema<typeof MatchParticipantView>;

export const BracketMatchView = t.Object({
  id: t.String(),
  tournamentId: t.String(),
  bracketRound: t.Number(),
  bracketSlot: t.Number(),
  status: MatchStatus,
  name: t.Union([t.String(), t.Null()]),
  winnerParticipantId: t.Union([t.String(), t.Null()]),
  nextRound: t.Union([t.Number(), t.Null()]),
  nextSlot: t.Union([t.Number(), t.Null()]),
  nextSide: t.Union([t.Number(), t.Null()]),
  participants: t.Array(MatchParticipantView),
});
export type BracketMatchView = UnwrapSchema<typeof BracketMatchView>;

export const BracketView = t.Object({
  tournamentId: t.String(),
  bracketSize: t.Number(),
  totalRounds: t.Number(),
  currentRound: t.Union([t.Number(), t.Null()]),
  rounds: t.Array(
    t.Object({ round: t.Number(), matches: t.Array(BracketMatchView) }),
  ),
});
export type BracketView = UnwrapSchema<typeof BracketView>;

export const BracketSingle = t.Object({ bracket: BracketView });
export type BracketSingle = UnwrapSchema<typeof BracketSingle>;

export const CreateMatchBody = t.Object({
  gameId: t.String(),
  tournamentId: t.Optional(t.String()),
  name: t.Optional(t.String({ maxLength: 120 })),
  participants: t.Array(
    t.Object({
      platformId: t.String(),
      externalUserId: t.String({ minLength: 1, maxLength: 200 }),
      displayName: t.Optional(t.String({ maxLength: 200 })),
    }),
    { minItems: 2, maxItems: 64 },
  ),
});
export type CreateMatchBody = UnwrapSchema<typeof CreateMatchBody>;

export const CompleteMatchBody = t.Object({
  winnerParticipantId: t.Optional(t.String()),
  winnerExternal: t.Optional(
    t.Object({
      platformId: t.String(),
      externalUserId: t.String({ minLength: 1, maxLength: 200 }),
    }),
  ),
});
export type CompleteMatchBody = UnwrapSchema<typeof CompleteMatchBody>;

export const PlatformWinnerBody = t.Object({
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
});
export type PlatformWinnerBody = UnwrapSchema<typeof PlatformWinnerBody>;

export const MatchIdParams = t.Object({
  organizationId: t.String(),
  matchId: t.String(),
});
export type MatchIdParams = UnwrapSchema<typeof MatchIdParams>;

export const PlatformMatchParams = t.Object({ matchId: t.String() });
export type PlatformMatchParams = UnwrapSchema<typeof PlatformMatchParams>;

export const MatchParticipants = t.Object({
  match: MatchView,
  participants: t.Array(MatchParticipantView),
});
export type MatchParticipants = UnwrapSchema<typeof MatchParticipants>;
